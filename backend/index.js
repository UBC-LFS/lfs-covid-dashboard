const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const ldap = require('ldapjs');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const mongoose = require('mongoose');
const axios = require('axios');
const _ = require('lodash');
const multer = require('multer');
const morganDev = require('morgan')('dev');
const upload = multer({ dest: 'uploads/' });
const { spawn } = require('child_process');
const moment = require('moment-timezone');
const { CheckInRecord, CheckOutRecord, FobRecord } = require('./record.model');

const {
  fetchJSONResponseReport,
  getAreaOfActivity,
  sortRecordsByTime,
  buildCheckInByBuilding,
} = require('./utils');

moment.tz.setDefault('America/Los_Angeles');

const PORT = process.env.PORT || 8080;

const checkInSurveyName = process.env.CHECKIN_SURVEY_NAME;
const checkOutSurveyName = process.env.CHECKOUT_SURVEY_NAME;
const downloadEveryMinutes = 10;

const publicKey = fs.readFileSync('./public.key', 'utf8');
const privateKEY = fs.readFileSync('./private.key', 'utf8');

let numCheckInRecords = 0;
let numCheckOutRecords = 0;

mongoose.connect(process.env.MONGO_CONNECTION_ADDRESS, {
  user: process.env.MONGO_RECORDS_USERNAME,
  pass: process.env.MONGO_RECORDS_PASSWORD,
  useNewUrlParser: true,
  useFindAndModify: false,
});

const { connection } = mongoose;
connection.once('open', () => {
  console.log('MongoDB database connection established successfully');
});

// configure .env file
require('dotenv').config();

/**
 * Generates object containing all loans mapped to their corresponding student/employee number
 * @return {Promise} a promise that resolves to a student/employee number loan mapping object
 */
const generateOutputJSON = async (callback, config) => {
  let checkInResponses;
  let checkOutResponses;
  try {
    ({ responses: checkInResponses } = await fetchJSONResponseReport(
      checkInSurveyName
    ));
    ({ responses: checkOutResponses } = await fetchJSONResponseReport(
      checkOutSurveyName
    ));
  } catch (e) {
    console.log('Error Generate Survey Json Files', e);
  }

  if (checkInResponses) {
    return callback({
      checkInResponses,
      checkOutResponses,
      ...config,
    });
  }

  return {};
};

const computeCvoidStats = async () => {
  let checkInResponses = [];
  let checkOutResponses = [];

  try {
    checkInResponses = await CheckInRecord.find();
    checkOutResponses = await CheckOutRecord.find();
  } catch (e) {
    console.log('Compute Covid Stats Error', e);
  }

  const checkInRecords = {};
  let numCheckInLast7Days = 0;
  let numCheckInLast31Days = 0;
  checkInResponses.forEach((response) => {
    const {
      areas, date, firstName, lastName, comments
    } = response;
    const recordedDate = moment(date);

    if (!checkInRecords[recordedDate.year()]) {
      checkInRecords[recordedDate.year()] = {};
    }

    if (!checkInRecords[recordedDate.year()][recordedDate.month() + 1]) {
      checkInRecords[recordedDate.year()][recordedDate.month() + 1] = {};
    }

    if (
      !checkInRecords[recordedDate.year()][recordedDate.month() + 1][
        recordedDate.date()
      ]
    ) {
      checkInRecords[recordedDate.year()][recordedDate.month() + 1][
        recordedDate.date()
      ] = [];
    }

    const record = {
      firstName,
      lastName,
      time: recordedDate.format('YYYY-MM-DDTHH:mm'),
      areas,
      comments,
    };

    checkInRecords[recordedDate.year()][recordedDate.month() + 1][
      recordedDate.date()
    ].push(record);

    // Add to total responses in past 7 and 31 days
    // if the response is recorded in the last 31 days
    if (recordedDate.isAfter(moment().subtract(31, 'days'), 'day')) {
      numCheckInLast31Days += 1;
      // if the response is recorded in the past 7 days
      if (recordedDate.isAfter(moment().subtract(7, 'days'), 'day')) {
        numCheckInLast7Days += 1;
      }
    }
  });

  const checkInRecordsThisYear = checkInRecords[moment().year()];
  const checkInRecordsThisMonth = _.isEmpty(checkInRecordsThisYear)
    ? {}
    : checkInRecordsThisYear[moment().month() + 1];
  const checkInRecordsToday = _.isEmpty(checkInRecordsThisMonth)
    || !checkInRecordsThisMonth[moment().date()]
    ? []
    : checkInRecordsThisMonth[moment().date()];

  // calculate check-ins by time of day today
  sortRecordsByTime(checkInRecordsToday);
  let sum = 0;
  const checkInByTime = checkInRecordsToday.reduce((acc, curr) => {
    sum += 1;
    acc[curr.time] = sum;
    return acc;
  }, {});

  // calculate check-ins by area today
  const checkInByArea = checkInRecordsToday.reduce((acc, curr) => {
    curr.areas.forEach((area) => {
      if (!acc[area]) {
        acc[area] = 0;
      }
      acc[area] += 1;
    });
    return acc;
  }, {});

  if (checkInByArea) {
    if (checkInByArea['MCML All floors']) {
      const floorCount = checkInByArea['MCML All floors'];
      Object.keys(checkInByArea).forEach((prop) => {
        if (prop.startsWith('MCML')) {
          checkInByArea[prop] += floorCount;
        }
      });
      delete checkInByArea['MCML All floors'];
    }
    if (checkInByArea['FNH All floors']) {
      const floorCount = checkInByArea['FNH All floors'];
      Object.keys(checkInByArea).forEach((prop) => {
        if (prop.startsWith('FNH')) {
          checkInByArea[prop] += floorCount;
        }
      });
      delete checkInByArea['FNH All floors'];
    }
  }

  // calculate check-ins by building today
  const checkInByBuilding = buildCheckInByBuilding(checkInRecordsToday);

  const summary = {};
  const checkInByDate = [];

  // calculate check-ins by date and weekly check-in summaries
  Object.keys(checkInRecords).forEach((year) => {
    Object.keys(checkInRecords[year]).forEach((month) => {
      Object.keys(checkInRecords[year][month]).forEach((date) => {
        const formattedDate = date < 10 ? `0${date}` : date;
        const time = `${year}-${month}-${formattedDate}`;
        const count = checkInRecords[year][month][date].length;
        checkInByDate.push({
          time,
          count,
        });

        if (
          !summary[
            moment(time, 'YYYY-MM-DD').startOf('week').format('YYYY-MM-DD')
          ]
        ) {
          summary[
            moment(time, 'YYYY-MM-DD').startOf('week').format('YYYY-MM-DD')
          ] = {};
        }

        summary[
          moment(time, 'YYYY-MM-DD').startOf('week').format('YYYY-MM-DD')
        ][moment(time, 'YYYY-MM-DD').format('YYYY-MM-DD')] = {
          count,
          byBuilding: buildCheckInByBuilding(checkInRecords[year][month][date]),
        };
      });
    });
  });
  sortRecordsByTime(checkInByDate);

  // Handle check-out responses
  const checkOutRecords = {};
  checkOutResponses.forEach((response) => {
    const {
      areas, date, firstName, lastName, comments
    } = response;
    const recordedDate = moment(date);

    if (!checkOutRecords[recordedDate.year()]) {
      checkOutRecords[recordedDate.year()] = {};
    }

    if (!checkOutRecords[recordedDate.year()][recordedDate.month() + 1]) {
      checkOutRecords[recordedDate.year()][recordedDate.month() + 1] = {};
    }

    if (
      !checkOutRecords[recordedDate.year()][recordedDate.month() + 1][
        recordedDate.date()
      ]
    ) {
      checkOutRecords[recordedDate.year()][recordedDate.month() + 1][
        recordedDate.date()
      ] = [];
    }

    const record = {
      firstName,
      lastName,
      time: recordedDate.format('YYYY-MM-DDTHH:mm'),
      areas,
      comments,
    };

    checkOutRecords[recordedDate.year()][recordedDate.month() + 1][
      recordedDate.date()
    ].push(record);
  });
  const checkOutRecordsThisYear = checkOutRecords[moment().year()];
  const checkOutRecordsThisMonth = _.isEmpty(checkOutRecordsThisYear)
    ? {}
    : checkOutRecordsThisYear[moment().month() + 1];
  const checkOutRecordsToday = _.isEmpty(checkOutRecordsThisMonth)
    || !checkOutRecordsThisMonth[moment().date()]
    ? []
    : checkOutRecordsThisMonth[moment().date()];

  // Get BC Covid-19 stats
  let bcCovidStats;
  try {
    const {
      data: { data },
    } = await axios.get('https://api.covid19tracker.ca/summary/split');
    bcCovidStats = data.find((prov) => prov.province === 'BC');
  } catch (err) {
    console.log(err);
  }

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
      buildingMaxOccupy: {
        // Max Occupancy for building floors obtained from safety-plan
        'MCML Basement': 3,
        'MCML Level 1': 57,
        'MCML Level 2': 22,
        'MCML Level 3': 34,
        'FNH Basement': null,
        'FNH Level 1': 29,
        'FNH Level 2': 42,
        'FNH Level 3': 38,
        'UBC Farm': null,
        'Totem Field': null,
        'Horticulture Greenhouse': null,
        'South Campus Greenhouse': null,
      },
      bcCovidStats,
    },
    summary,
  };
};

const updateRecords = ({
  checkInResponses,
  checkOutResponses,
  time = moment(),
  period = 'day',
}) => {
  // perform checkin survey data database update if there are new reponses
  if (checkInResponses.length > numCheckInRecords) {
    numCheckInRecords = checkInResponses.length;
    checkInResponses.forEach(async (response) => {
      // only account for survey responses that are completed
      if (response && response.values && response.values.finished) {
        const {
          recordedDate: rawRecordedDate,
          _recordId: _id,
        } = response.values;
        const recordedDate = moment(rawRecordedDate);
        
        // only account for new survey responses that has not been recorded in database
        if (recordedDate.isSameOrAfter(time, period)) {
          // extract key information from new survey repsonses
          const {
            QID10: buildings,
            QID13: fnhLevels,
            QID14: mcmlLevels,
          } = response.labels;
          const {
            QID3_4: firstName,
            QID3_5: lastName,
            QID10_TEXT: otherAreas,
            QID15_TEXT: comments,
          } = response.values;

          let areas = [];
          if (buildings) {
            areas = getAreaOfActivity(
              buildings,
              fnhLevels,
              mcmlLevels,
              otherAreas
            );
          }
          // save new checkin survey response data into the database
          try {
            await CheckInRecord.findOneAndUpdate(
              { _id },
              {
                _id,
                firstName,
                lastName,
                date: recordedDate.toDate(),
                areas,
                comments,
              },
              {
                upsert: true,
                new: true,
              }
            );
          } catch (e) {
            console.log(e);
          }
        }
      }
    });
  }

  // perform checkout survey data database update if there are new reponses
  if (checkOutResponses.length > numCheckOutRecords) {
    numCheckOutRecords = checkOutResponses.length;
    checkOutResponses.forEach(async (response) => {
      // only account for survey responses that are completed
      if (response && response.values && response.values.finished) {
        const {
          recordedDate: rawRecordedDate,
          _recordId: _id,
        } = response.values;
        const recordedDate = moment(rawRecordedDate);
        
        // only account for new survey responses that has not been recorded in database
        if (recordedDate.isSameOrAfter(time, period)) {
          // extract key information from new survey repsonses
          const {
            QID14: buildings,
            QID16: fnhAreas,
            QID13: mcmlAreas,
          } = response.labels;
          const {
            QID3_4: firstName,
            QID3_5: lastName,
            QID14_6_TEXT: otherBuildings,
            QID15_TEXT: comments,
          } = response.values;

          let areas = [];
          if (buildings) {
            areas = getAreaOfActivity(
              buildings,
              fnhAreas,
              mcmlAreas,
              otherBuildings
            );
          }
          
          // save new checkout survey response data into the database
          try {
            await CheckOutRecord.findOneAndUpdate(
              { _id },
              {
                _id,
                firstName,
                lastName,
                date: recordedDate.toDate(),
                areas,
                comments,
              },
              {
                upsert: true,
                new: true,
              }
            );
          } catch (e) {
            console.log(e);
          }
        }
      }
    });
  }
  console.log(`records updated ${moment().format('YYYY-MM-DDTHH:mm')}`);
};

// get fob data for a specific week
const getFobData = async (week) => {
  try {
    const fobData = await FobRecord.findOne({ week });
    return {
      status: 200,
      fobData,
    };
  } catch (err) {
    return {
      status: 500,
      error: err,
    };
  }
};

// update fob data for a specific week in databse
// method used by manual fob data entry
const updateFobData = async ({ week, newData }) => {
  try {
    await FobRecord.findOneAndUpdate(
      { week },
      {
        week,
        data: new Map(JSON.parse(newData)),
      },
      {
        upsert: true,
        new: true,
      }
    );
    return {
      status: 200,
    };
  } catch (err) {
    console.log(err);
    return {
      status: 500,
      error: err,
    };
  }
};

// update fob data for a specific week in database
// method used by fob data excel upload
const findAndUpdateFobData = async ({ week, newData }) => {
  let doc;
  try {
    doc = await FobRecord.findOne({ week });
    if (doc) {
      const map = Object.fromEntries(doc.data);
      newData.forEach((day) => {
        if (map[day[0]]) {
          const json = JSON.parse(map[day[0]]);
          map[day[0]] = JSON.stringify({
            ...json,
            ...JSON.parse(day[1]),
          });
        } else {
          const [ day0, day1 ] = day;
          map[day0] = day1;
        }
      });
      doc.data = new Map(Object.entries(map));
    } else {
      doc = new FobRecord({ week, data: new Map(newData) });
    }
    await doc.save();

    return {
      status: 200,
    };
  } catch (err) {
    console.log(err);
    return {
      status: 500,
      error: err,
    };
  }
};

// save fob data from excel to database
const saveFobData = ({ file, res }) => {
  // create python process for running fob data extraction script
  const python = spawn('python', [
    'fobdata.py',
    '--filepath',
    file.path,
    '--building',
    file.originalname,
  ]);
  // collect fob data from script
  let dataToSend;
  python.stdout.on('data', (data) => {
    console.log('Pipe data from python script ...');
    dataToSend = data.toString();
    console.log('Report summary: ', dataToSend);
  });
  python.stderr.on('data', (data) => {
    console.log('ERR ', data.toString());
  });
  // save fob data from excel to database after all data has been extracted
  python.on('close', async (code) => {
    console.log(`child process close all stdio with code ${code}`);
    let json = {};
    try {
      json = JSON.parse(dataToSend);
    } catch (e) {
      console.log(e);
    }
    const newJson = {};
    const keyName = `${file.originalname}Fob`;
    Object.entries(json).forEach(([ key, value ]) => {
      const week = moment(key, 'MMM Do, YYYY')
        .startOf('week')
        .format('YYYY-MM-DD');
      if (newJson[week]) {
        newJson[week].push([ key, JSON.stringify({ [keyName]: value }) ]);
      } else {
        newJson[week] = [ [ key, JSON.stringify({ [keyName]: value }) ] ];
      }
    });
    let groupUpdateResult = {
      status: 200,
    };
    const promises = [];
    Object.entries(newJson).forEach(([ key, value ]) => {
      promises.push(findAndUpdateFobData({ week: key, newData: value }));
    });
    const results = await Promise.all(promises);
    results.forEach((result) => {
      if (result.status === 500) {
        groupUpdateResult = result;
      }
    });
    fs.unlink(file.path, (err) => {
      if (err) {
        console.error(err);
      }
    });
    res.status(groupUpdateResult.status).send(groupUpdateResult);
  });
};

generateOutputJSON(updateRecords, { time: '2021-01-10' });

// set up timer to fetch records from Qualtrics once every specified period
setInterval(() => {
  generateOutputJSON(updateRecords, {
    time: moment().subtract(10, 'minutes'),
    period: 'minute',
  });
}, downloadEveryMinutes * 60000);

const app = express();

if (process.env.NODE_ENV !== 'production') {
  app.use(morganDev);
}

// set up cookie parser
app.use(cookieParser());

// set up cors
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// parse request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// serve static front-end content
app.use(express.static(path.join(__dirname, 'build')));

// routes
// route for computing covid stats
app.get(
  '/api/covid',
  expressJwt({
    secret: publicKey,
    issuer: 'UBC LFS',
    algorithms: [ 'RS256' ],
  }),
  (req, res) => {
    computeCvoidStats()
      .then((stats) => res.json(stats))
      .catch((err) => {
        console.log(err);
        return res.status(500).send();
      });
  }
);

// route for updating fob data
app.post(
  '/api/fob/update',
  expressJwt({
    secret: publicKey,
    issuer: 'UBC LFS',
    algorithms: [ 'RS256' ],
  }),
  (req, res) => {
    updateFobData(req.body).then((result) => res.status(result.status).send(result));
  }
);

// route for querying fob data
app.post(
  '/api/fob/query',
  expressJwt({
    secret: publicKey,
    issuer: 'UBC LFS',
    algorithms: [ 'RS256' ],
  }),
  (req, res) => {
    getFobData(req.body.week).then((result) => res.status(result.status).send(result));
  }
);

// route for uploading fob data
app.post(
  '/api/fob/upload',
  [
    expressJwt({
      secret: publicKey,
      issuer: 'UBC LFS',
      algorithms: [ 'RS256' ],
    }),
    upload.single('fobdata'),
  ],
  (req, res) => {
    const { file } = req;
    saveFobData({ file, res });
  }
);

// route for login
app.post('/api/login', (req, response) => {
  const client = ldap.createClient({
    url: process.env.UBC_LDAP_SERVER,
  });
  // first ldap bind for authencating CWL login
  client.bind(
    `uid=${req.body.cwlId},ou=People,dc=landfood,dc=ubc,dc=ca`,
    req.body.password,
    (err) => {
      if (err) {
        client.unbind();
        return response.status(401).send('Not Authenticated');
      }
      // second ldaq bind for authencating covid dashboard group login
      client.bind(
        'cn=covid-dashboard-svc-host,ou=Service Accounts,dc=landfood,dc=ubc,dc=ca',
        process.env.UBC_LDAP_SERVICE_ACCOUNT_PWD,
        (serviceAccBindErr) => {
          if (serviceAccBindErr) {
            client.unbind();
            return response.status(401).send('Not Authenticated');
          }
          // search for CWL id within covid dashboard group
          client.search(
            'cn=covid-dashboard,ou=Roles,ou=Groups,dc=landfood,dc=ubc,dc=ca',
            {
              scope: 'base',
            },
            (error, res) => {
              if (error) {
                client.unbind();
                return response.status(401).send('Not Authenticated');
              }
              res.on('searchEntry', (entry) => {
                const { member } = entry.object;
                // upon successful search for cwl id in group, sign and return jwt token valid for 1 hour
                if (member.some((m) => m.includes(`uid=${req.body.cwlId}`))) {
                  const expiration = moment().add(1, 'h');
                  const exp = expiration.unix();

                  const signingOptions = {
                    issuer: 'UBC LFS',
                    algorithm: 'RS256',
                  };

                  const token = jwt.sign(
                    {
                      uid: req.body.cwlId,
                      exp,
                    },
                    privateKEY,
                    signingOptions
                  );
                  return response
                    .cookie('access_token', `Bearer ${token}`, {
                      expires: expiration.toDate(),
                    })
                    .status(200)
                    .send('Authenticated');
                }
                return response.status(401).send('Not Authenticated');
              });
              res.on('searchReference', (referral) => {
                console.log(`referral: ${referral.uris.join()}`);
              });
              res.on('error', (e) => {
                console.error(`error: ${e.message}`);
              });
              res.on('end', (onEndResult) => {
                console.log(`status: ${onEndResult.status}`);
              });
              return 0;
            }
          );
          return 0;
        }
      );
      return 0;
    }
  );
});

// send all requests to /
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}.`);
});
