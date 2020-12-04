const fs = require('fs')
const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const ldap = require('ldapjs');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');

const { fetchJSONResponseReport, getAreaOfActivity, sortRecordsByTime, buildCheckInByBuilding } = require('./utils')
const moment = require('moment')

const PORT = process.env.PORT || 4000

const checkInSurveyName = process.env.CHECKIN_SURVEY_NAME
const checkOutSurveyName = process.env.CHECKOUT_SURVEY_NAME
const downloadEveryMinutes = 10

const privateKEY  = fs.readFileSync('./private.key', 'utf8');

// configure .env file
require('dotenv').config()

/**
 * Generates object containing all loans mapped to their corresponding student/employee number
 * @return {Promise} a promise that resolves to a student/employee number loan mapping object
*/
const generateOutputJSON = async () => {
  let checkInResponses = {}
  let checkOutResponses = {}
  let fileModifiedOn

  try {
    const { mtimeMs } = fs.statSync(checkInSurveyName + '.json')
    fileModifiedOn = Math.floor(mtimeMs)
  } catch (e) {
    fileModifiedOn = null
  }

  if (!fileModifiedOn || Date.now() - fileModifiedOn >= downloadEveryMinutes * 60000) {
    console.log(`File not found or created more than ${downloadEveryMinutes} minutes ago. Downloading..."`)
    checkInResponses = await fetchJSONResponseReport(checkInSurveyName)
    checkOutResponses = await fetchJSONResponseReport(checkOutSurveyName)
  } else {
    console.log('Recent file found. Reading content...')
    checkInResponses = JSON.parse(fs.readFileSync(checkInSurveyName + '.json'))
    checkOutResponses = JSON.parse(fs.readFileSync(checkOutSurveyName + '.json'))
  }

  if (checkInResponses.responses) {
    return computeCvoidStats(checkInResponses.responses, checkOutResponses.responses);
  }

  return {}
}

const computeCvoidStats = (checkInResponses, checkOutResponses) => {
  const checkInRecords = {};
  let numCheckInLast7Days = 0;
  let numCheckInLast31Days = 0;
  checkInResponses.forEach((response) => {
    if(response && response.values && response.values.finished){
      const { recordedDate: rawRecordedDate } = response.values;
      const recordedDate = moment(rawRecordedDate);

      if(recordedDate.isAfter('2020-10-16', 'day')){
        const { QID10: buildings, QID13: fnhLevels, QID14: mcmlLevels } = response.labels;
        const { QID3_4: firstName, QID3_5: lastName, QID10_TEXT: otherAreas, QID15_TEXT: comments } = response.values;
        
        let areas = [];
        if(buildings){
          areas = getAreaOfActivity(buildings, fnhLevels, mcmlLevels, otherAreas);
        }

        if(!checkInRecords[recordedDate.year()]){
          checkInRecords[recordedDate.year()] = {};
        }

        if(!checkInRecords[recordedDate.year()][recordedDate.month() + 1]){
          checkInRecords[recordedDate.year()][recordedDate.month() + 1] = {};
        }

        if(!checkInRecords[recordedDate.year()][recordedDate.month() + 1][recordedDate.date()]){
          checkInRecords[recordedDate.year()][recordedDate.month() + 1][recordedDate.date()] = [];
        }

        const record = {
          firstName,
          lastName,
          time: recordedDate.format('YYYY-MM-DDTHH:mm'),
          areas,
          comments,
        };

        checkInRecords[recordedDate.year()][recordedDate.month() + 1][recordedDate.date()].push(record);

        //Add to total responses in past 7 and 31 days
        //if the response is recorded in the last 31 days
        if(recordedDate.isAfter(moment().subtract(31, 'days'), 'day')){
          numCheckInLast31Days++;
          //if the response is recorded in the past 7 days
          if(recordedDate.isAfter(moment().subtract(7, 'days'), 'day')){
            numCheckInLast7Days++;
          }
        }
      }
    }
  })

  const checkInRecordsToday = checkInRecords[moment().year()][moment().month() + 1][moment().date()] || [];

  // calculate check-ins by time of day today
  sortRecordsByTime(checkInRecordsToday);
  let sum = 0;
  const checkInByTime = checkInRecordsToday.reduce((acc, curr) => {
    acc[curr.time] = ++sum;
    return acc;
  }, {});

  // calculate check-ins by area today
  const checkInByArea = checkInRecordsToday.reduce((acc, curr) => {
    curr.areas.forEach(area => {
      if(!acc[area]){
        acc[area] = 0;
      }
      acc[area]++;
    });
    return acc;
  }, {});

  if(checkInByArea){
    if(checkInByArea['MCML All floors']){
      let floorCount = checkInByArea['MCML All floors']
      for(const prop in checkInByArea){
        if(prop.startsWith('MCML')){
          checkInByArea[prop] += floorCount;
        }
      }
      delete checkInByArea['MCML All floors']
    }
    if(checkInByArea['FNH All floors']){
      let floorCount = checkInByArea['FNH All floors']
      for(const prop in checkInByArea){
        if(prop.startsWith('FNH')){
          checkInByArea[prop] += floorCount;
        }
      }
      delete checkInByArea['FNH All floors']
    }
  }

  // calculate check-ins by building today
  const checkInByBuilding = buildCheckInByBuilding(checkInRecordsToday);

  const checkInThisWeek = {};
  const checkInLastWeek = {};
  let totalCheckInThisWeek = 0;
  let totalCheckInLastWeek = 0;

  const checkInByDate = [];
  for(let year in checkInRecords){
    for(let month in checkInRecords[year]){
      for(let date in checkInRecords[year][month]){
        const formattedDate = date < 10 ? "0" + date : date;
        const time = year + "-" + month + "-" + formattedDate;
        const count = checkInRecords[year][month][date].length;
        checkInByDate.push({
          time,
          count
        })

        const isThisWeek = moment().startOf('week').isSameOrBefore(time, 'day');
        const isLastWeek = moment().subtract(7, 'days').startOf('week').isSameOrBefore(time, 'day') && !isThisWeek;
        
        // Totals check in this week
        if(isThisWeek){
          const checksInsThisWeekByBuilding = buildCheckInByBuilding(checkInRecords[year][month][date]);
          checkInThisWeek[moment(time, "YYYY-MM-DD").format('dddd')] = {
            count,
            byBuilding: checksInsThisWeekByBuilding
          };
          totalCheckInThisWeek += count;
        }else if(isLastWeek){ // Totals check in last week
          // const checksInsThisWeekByBuilding = buildCheckInByBuilding(checkInRecords[year][month][date]);
          checkInLastWeek[moment(time, "YYYY-MM-DD").format('dddd')] = {
            count,
            // byBuilding: checksInsThisWeekByBuilding
          };
          totalCheckInLastWeek += count;
        }
      }
    }
  }
  sortRecordsByTime(checkInByDate);


  //Handle check-out responses
  const checkOutRecords = {};
  checkOutResponses.forEach((response) => {
    if(response && response.values && response.values.finished){
      const { recordedDate: rawRecordedDate } = response.values;
      const recordedDate = moment(rawRecordedDate);

      if(recordedDate.isAfter('2020-11-23', 'day')){
        const { QID14: buildings, QID16: fnhAreas, QID13: mcmlAreas, QID17: commonAreas} = response.labels;
        const { 
          QID3_4: firstName, 
          QID3_5: lastName, 
          QID14_6_TEXT: otherBuildings, 
          QID15_TEXT: comments,
        } = response.values;
        
        let areas = [];
        if(buildings){
          areas = getAreaOfActivity(buildings, fnhAreas, mcmlAreas, otherBuildings);
        }

        if(!checkOutRecords[recordedDate.year()]){
          checkOutRecords[recordedDate.year()] = {};
        }

        if(!checkOutRecords[recordedDate.year()][recordedDate.month() + 1]){
          checkOutRecords[recordedDate.year()][recordedDate.month() + 1] = {};
        }

        if(!checkOutRecords[recordedDate.year()][recordedDate.month() + 1][recordedDate.date()]){
          checkOutRecords[recordedDate.year()][recordedDate.month() + 1][recordedDate.date()] = [];
        }

        const record = {
          firstName,
          lastName,
          time: recordedDate.format('YYYY-MM-DDTHH:mm'),
          areas,
          comments,
        };

        checkOutRecords[recordedDate.year()][recordedDate.month() + 1][recordedDate.date()].push(record);
      }
    }
  })
  const checkOutRecordsToday = checkOutRecords[moment().year()][moment().month() + 1][moment().date()] || [];


  return {
    checkInRecords,
    checkOutRecords,
    stats: {
      numCheckInToday: checkInRecordsToday.length,
      numCheckInLast7Days,
      numCheckInLast31Days,
      numCheckOutToday: checkOutRecordsToday.length,
      checkInByTime,
      checkInByBuilding,
      checkInByArea,
      checkInByDate,
      buildingMaxOccupy: { //Max Occupancy for building floors obtained from safety-plan
        "MCML Basement": 3,
        "MCML Level 1": 57,
        "MCML Level 2": 22,
        "MCML Level 3": 34,
        "FNH Basement": null,
        "FNH Level 1": 29,
        "FNH Level 2": 42,
        "FNH Level 3": 38,
        "UBC Farm": null,
        "Greenhouse": null,
      }
    },
    summary: {
      totalCheckInThisWeek,
      totalCheckInLastWeek,
      checkInThisWeek,
      checkInLastWeek
    }
  }
}

const app = express()

if (process.env.NODE_ENV !== 'production') {
  app.use(require('morgan')('dev'))
}

// set up cookie parser
app.use(cookieParser())

// set up cors
app.use(cors({
  origin: true,
  credentials: true 
}))

// parse request body
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// loans endpoint
app.get('/api/covid', 
  expressJwt({ 
    secret: privateKEY, 
    issuer: 'UBC LFS',
    algorithms: ['RS256']
  }),(req, res) => {

  generateOutputJSON()
    .then(stats => {
      return res.json(stats)
    })
    .catch(err => {
      console.log(err)
      return res.status(500).send()
    })
})

app.post('/api/login', (req, response) => {
  const client = ldap.createClient({
    url: process.env.UBC_LDAP_SERVER
  });
  //Todo: Finish LDAP search, implement bearer token validation
  // client.bind(`uid=${req.body.cwlId},ou=People,o=eldaproot`, req.body.password, function(err){
  client.bind(`cn=${req.body.cwlId},ou=Service Accounts,dc=landfood,dc=ubc,dc=ca`, req.body.password, function(err){
    if(err){
      client.unbind();
      return response.status(401).send('Not Authenticated');
    }
    client.search('cn=covid-dashboard,ou=Roles,ou=Groups,dc=landfood,dc=ubc,dc=ca', {
      scope: 'base',
    }, function(error, res) {
      if(error){
        client.unbind();
        return response.status(401).send('Not Authenticated');
      }
      res.on('searchEntry', function(entry) {
        const { member } = entry.object;
        // TODO: replace cliu55 with req.body.cwlID
        // return member.some(m => m.includes(`uid=${req.body.cwlId}`)) ? 
        if(member.some(m => m.includes(`uid=cliu55`))){
          const expiration = moment().add(1, 'h');
          const exp = expiration.unix();

          const signingOptions = {
            issuer: 'UBC LFS',
            expiresIn: '1h',
            algorithm: 'RS256'
          };

          const token = jwt.sign(
            {
              uid: req.body.cwlId
            }, 
            privateKEY,
            signingOptions
          );
          return response
            .cookie('access_token', 'Bearer ' + token, {
              expires: expiration.toDate(),
            })
            .status(200)
            .send('Authenticated');
        }else{
            return response.status(401).send('Not Authenticated');
        }
      });
      res.on('searchReference', function(referral) {
        console.log('referral: ' + referral.uris.join());
      });
      res.on('error', function(err) {
        console.error('error: ' + err.message);
      });
      res.on('end', function(onEndResult) {
        console.log('status: ' + onEndResult.status);
      });
    });
  });
});

// serve static front-end content
app.use(express.static('build'))

// send all requests to /
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
})

app.listen(PORT, () => { console.log(`App listening on port ${PORT}.`) })
