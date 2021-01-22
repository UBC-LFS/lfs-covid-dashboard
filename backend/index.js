const fs = require("fs");
const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const ldap = require("ldapjs");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const mongoose = require("mongoose");
const axios = require("axios");
const _ = require("lodash");
const { CheckInRecord, CheckOutRecord, FobRecord } = require("./record.model");

const {
  fetchJSONResponseReport,
  getAreaOfActivity,
  sortRecordsByTime,
  buildCheckInByBuilding,
} = require("./utils");
const moment = require("moment-timezone");
moment.tz.setDefault("America/Los_Angeles");

const PORT = process.env.PORT || 8080;

const checkInSurveyName = process.env.CHECKIN_SURVEY_NAME;
const checkOutSurveyName = process.env.CHECKOUT_SURVEY_NAME;
const downloadEveryMinutes = 10;

const publicKey = fs.readFileSync("./public.key", "utf8");
const privateKEY = fs.readFileSync("./private.key", "utf8");

let numCheckInRecords = 0;
let numCheckOutRecords = 0;

mongoose.connect(process.env.MONGO_CONNECTION_ADDRESS, {
  user: process.env.MONGO_RECORDS_USERNAME,
  pass: process.env.MONGO_RECORDS_PASSWORD,
  useNewUrlParser: true,
  useFindAndModify: false,
});

const connection = mongoose.connection;
connection.once("open", function () {
  console.log("MongoDB database connection established successfully");
});

// configure .env file
require("dotenv").config();

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
    console.log("Error Generate Survey Json Files", e);
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
    console.log("Compute Covid Stats Error", e);
  }

  const checkInRecords = {};
  let numCheckInLast7Days = 0;
  let numCheckInLast31Days = 0;
  checkInResponses.forEach((response) => {
    const { areas, date, firstName, lastName, comments } = response;
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
      time: recordedDate.format("YYYY-MM-DDTHH:mm"),
      areas,
      comments,
    };

    checkInRecords[recordedDate.year()][recordedDate.month() + 1][
      recordedDate.date()
    ].push(record);

    //Add to total responses in past 7 and 31 days
    //if the response is recorded in the last 31 days
    if (recordedDate.isAfter(moment().subtract(31, "days"), "day")) {
      numCheckInLast31Days++;
      //if the response is recorded in the past 7 days
      if (recordedDate.isAfter(moment().subtract(7, "days"), "day")) {
        numCheckInLast7Days++;
      }
    }
  });

  const checkInRecordsThisYear = checkInRecords[moment().year()];
  const checkInRecordsThisMonth = _.isEmpty(checkInRecordsThisYear)
    ? {}
    : checkInRecordsThisYear[moment().month() + 1];
  const checkInRecordsToday = _.isEmpty(checkInRecordsThisMonth) || !checkInRecordsThisMonth[moment().date()]
    ? []
    : checkInRecordsThisMonth[moment().date()];

  // calculate check-ins by time of day today
  sortRecordsByTime(checkInRecordsToday);
  let sum = 0;
  const checkInByTime = checkInRecordsToday.reduce((acc, curr) => {
    acc[curr.time] = ++sum;
    return acc;
  }, {});

  // calculate check-ins by area today
  const checkInByArea = checkInRecordsToday.reduce((acc, curr) => {
    curr.areas.forEach((area) => {
      if (!acc[area]) {
        acc[area] = 0;
      }
      acc[area]++;
    });
    return acc;
  }, {});

  if (checkInByArea) {
    if (checkInByArea["MCML All floors"]) {
      let floorCount = checkInByArea["MCML All floors"];
      for (const prop in checkInByArea) {
        if (prop.startsWith("MCML")) {
          checkInByArea[prop] += floorCount;
        }
      }
      delete checkInByArea["MCML All floors"];
    }
    if (checkInByArea["FNH All floors"]) {
      let floorCount = checkInByArea["FNH All floors"];
      for (const prop in checkInByArea) {
        if (prop.startsWith("FNH")) {
          checkInByArea[prop] += floorCount;
        }
      }
      delete checkInByArea["FNH All floors"];
    }
  }

  // calculate check-ins by building today
  const checkInByBuilding = buildCheckInByBuilding(checkInRecordsToday);

  const summary = {};
  const checkInByDate = [];

  // calculate check-ins by date and weekly check-in summaries
  for (let year in checkInRecords) {
    for (let month in checkInRecords[year]) {
      for (let date in checkInRecords[year][month]) {
        const formattedDate = date < 10 ? "0" + date : date;
        const time = year + "-" + month + "-" + formattedDate;
        const count = checkInRecords[year][month][date].length;
        checkInByDate.push({
          time,
          count,
        });

        if (
          !summary[
            moment(time, "YYYY-MM-DD").startOf("week").format("YYYY-MM-DD")
          ]
        ) {
          summary[
            moment(time, "YYYY-MM-DD").startOf("week").format("YYYY-MM-DD")
          ] = {};
        }

        summary[
          moment(time, "YYYY-MM-DD").startOf("week").format("YYYY-MM-DD")
        ][moment(time, "YYYY-MM-DD").format("YYYY-MM-DD")] = {
          count,
          byBuilding: buildCheckInByBuilding(checkInRecords[year][month][date]),
        };
      }
    }
  }
  sortRecordsByTime(checkInByDate);

  //Handle check-out responses
  const checkOutRecords = {};
  checkOutResponses.forEach((response) => {
    const { areas, date, firstName, lastName, comments } = response;
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
      time: recordedDate.format("YYYY-MM-DDTHH:mm"),
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
  const checkOutRecordsToday = _.isEmpty(checkOutRecordsThisMonth) || !checkOutRecordsThisMonth[moment().date()]
    ? []
    : checkOutRecordsThisMonth[moment().date()];

    // Get BC Covid-19 stats
  let bcCovidStats;
  try {
    const {
      data: { data },
    } = await axios.get(`https://api.covid19tracker.ca/summary/split`);
    bcCovidStats = data.find((prov) => prov.province === "BC");
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
        //Max Occupancy for building floors obtained from safety-plan
        "MCML Basement": 3,
        "MCML Level 1": 57,
        "MCML Level 2": 22,
        "MCML Level 3": 34,
        "FNH Basement": null,
        "FNH Level 1": 29,
        "FNH Level 2": 42,
        "FNH Level 3": 38,
        "UBC Farm": null,
        "Totem Field": null,
        "Horticulture Greenhouse": null,
        "South Campus Greenhouse": null,
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
  period = "day",
}) => {
  if (checkInResponses.length > numCheckInRecords) {
    numCheckInRecords = checkInResponses.length;
    checkInResponses.forEach(async (response) => {
      if (response && response.values && response.values.finished) {
        const {
          recordedDate: rawRecordedDate,
          _recordId: _id,
        } = response.values;
        const recordedDate = moment(rawRecordedDate);

        if (recordedDate.isSameOrAfter(time, period)) {
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

  if (checkOutResponses.length > numCheckOutRecords) {
    numCheckOutRecords = checkOutResponses.length;
    checkOutResponses.forEach(async (response) => {
      if (response && response.values && response.values.finished) {
        const {
          recordedDate: rawRecordedDate,
          _recordId: _id,
        } = response.values;
        const recordedDate = moment(rawRecordedDate);

        if (recordedDate.isSameOrAfter(time, period)) {
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
  console.log(`records updated ${moment().format("YYYY-MM-DDTHH:mm")}`);
};

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

generateOutputJSON(updateRecords, { time: "2021-01-10" });

setInterval(function () {
  generateOutputJSON(updateRecords, {
    time: moment().subtract(10, "minutes"),
    period: "minute",
  });
}, downloadEveryMinutes * 60000);

const app = express();

if (process.env.NODE_ENV !== "production") {
  app.use(require("morgan")("dev"));
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
app.use(express.static(path.join(__dirname, "build")));

app.get(
  "/api/covid",
  expressJwt({
    secret: publicKey,
    issuer: "UBC LFS",
    algorithms: ["RS256"],
  }),
  (req, res) => {
    computeCvoidStats()
      .then((stats) => {
        return res.json(stats);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).send();
      });
  }
);

app.post(
  "/api/fob/update",
  expressJwt({
    secret: publicKey,
    issuer: "UBC LFS",
    algorithms: ["RS256"],
  }),
  (req, res) => {
    updateFobData(req.body).then((result) =>
      res.status(result.status).send(result)
    );
  }
);

app.post(
  "/api/fob/query",
  expressJwt({
    secret: publicKey,
    issuer: "UBC LFS",
    algorithms: ["RS256"],
  }),
  (req, res) => {
    getFobData(req.body.week).then((result) =>
      res.status(result.status).send(result)
    );
  }
);

app.post("/api/login", (req, response) => {
  const client = ldap.createClient({
    url: process.env.UBC_LDAP_SERVER,
  });
  client.bind(
    `uid=${req.body.cwlId},ou=People,dc=landfood,dc=ubc,dc=ca`,
    req.body.password,
    function (err) {
      if (err) {
        client.unbind();
        return response.status(401).send("Not Authenticated");
      }
      client.bind(
        `cn=covid-dashboard-svc-host,ou=Service Accounts,dc=landfood,dc=ubc,dc=ca`,
        process.env.UBC_LDAP_SERVICE_ACCOUNT_PWD,
        function (serviceAccBindErr) {
          if (serviceAccBindErr) {
            client.unbind();
            return response.status(401).send("Not Authenticated");
          }
          client.search(
            "cn=covid-dashboard,ou=Roles,ou=Groups,dc=landfood,dc=ubc,dc=ca",
            {
              scope: "base",
            },
            function (error, res) {
              if (error) {
                client.unbind();
                return response.status(401).send("Not Authenticated");
              }
              res.on("searchEntry", function (entry) {
                const { member } = entry.object;
                if (member.some((m) => m.includes(`uid=${req.body.cwlId}`))) {
                  const expiration = moment().add(1, "h");
                  const exp = expiration.unix();

                  const signingOptions = {
                    issuer: "UBC LFS",
                    expiresIn: "1h",
                    algorithm: "RS256",
                  };

                  const token = jwt.sign(
                    {
                      uid: req.body.cwlId,
                    },
                    privateKEY,
                    signingOptions
                  );
                  return response
                    .cookie("access_token", "Bearer " + token, {
                      expires: expiration.toDate(),
                    })
                    .status(200)
                    .send("Authenticated");
                } else {
                  return response.status(401).send("Not Authenticated");
                }
              });
              res.on("searchReference", function (referral) {
                console.log("referral: " + referral.uris.join());
              });
              res.on("error", function (err) {
                console.error("error: " + err.message);
              });
              res.on("end", function (onEndResult) {
                console.log("status: " + onEndResult.status);
              });
            }
          );
        }
      );
    }
  );
});

// send all requests to /
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}.`);
});
