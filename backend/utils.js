const {
  createResponseExport,
  getResponseExportProgress,
  getResponseExportFile,
} = require("node-qualtrics-api");

const fs = require("fs");
const JSZip = require("jszip");
const moment = require("moment-timezone");

/**
 * Donwloads a compressed file containing a new response export
 * @param {String} survey name of the survey
 * @param {String} format file format (can be csv, tsv, spss, json, ndjson, or xml)
 * @param {String} fileName name of output file
 * @return {Promise} A promise that resolves to an object containing the compressed folder's name
 */
const downloadResponseReportZIP = async (survey, format, fileName) => {
  let exportProgressId;

  // initiate the response export
  const responseExport = await createResponseExport(survey, format);

  // if the export was initiated successfully, get progress ID
  if (responseExport.result && responseExport.result.progressId) {
    exportProgressId = responseExport.result.progressId;

    let exportStatus;

    // get the response progress
    let responseExportProgress = await getResponseExportProgress(
      survey,
      exportProgressId
    );

    if (responseExportProgress.result) {
      exportStatus = responseExportProgress.result.status;

      // check export status until it completes or fails
      while (exportStatus !== "complete") {
        responseExportProgress = await getResponseExportProgress(
          survey,
          exportProgressId
        );
        exportStatus = responseExportProgress.result.status;

        if (exportStatus === "failed" || typeof exportStatus === "undefined") {
          return { error: true, description: "Qualtrics export failed" };
        }
      }

      const { fileId } = responseExportProgress.result;
      const exportFile = await getResponseExportFile(survey, fileId);

      if (Buffer.isBuffer(exportFile)) {
        console.log("Creating zip file...");

        // remove spaces from filename
        fileName = fileName.replace(" ", "");
        const zipFileName = /.zip$/.test(fileName)
          ? fileName
          : fileName + ".zip";

        // create zip file containing the response report
        fs.writeFileSync(zipFileName, exportFile);

        console.log("Zip file created successfully.\n");
        return {
          error: false,
          description: "Zip file created successfully.",
          fileName: zipFileName,
        };
      }
    }
  }
};

/**
 * Donwloads a compressed file containing a new response export
 * @param {String} filePath relative path to file
 */
const unzipResponseReport = async (filePath) => {
  // check that the file requested is a zip file
  const zipFileName = filePath.match(/[a-z0-9_-]\.zip$/i);

  // check if a zip file was correctly included at the end of the path
  if (!zipFileName) {
    throw new Error("invalid .zip file path " + `[ ${filePath} ]\n`);
  }

  console.log("Unzipping folder...");

  const data = fs.readFileSync(filePath);

  const zip = new JSZip();

  const contents = await zip.loadAsync(data);

  for (const filename of Object.keys(contents.files)) {
    const content = await zip.file(filename).async("nodebuffer");
    fs.writeFileSync(filename, content);
  }

  console.log("Folder unzipped successfully.\n");
};

/**
 * Donwloads a JSON file containing all responses
 * @param {String} surveyName name of the survey whose responses are being requested
 * @return {Promise} promise that resolves to a JSON object containing response export data
 */
const fetchJSONResponseReport = async (surveyName) => {
  // download the file from qualtrics
  const download = await downloadResponseReportZIP(
    surveyName,
    "json",
    surveyName
  );

  // on the event of a download error, throw the error
  if (download.error) {
    throw download.error;
  }

  // unzip the response report compressed folder
  await unzipResponseReport(download.fileName);

  // get the file contents and return
  return JSON.parse(fs.readFileSync(surveyName + ".json"));
};

const getAreaOfActivity = (buildings, fnhLevels, mcmlLevels, otherAreas) => {
  const areas = buildings.filter(
    (building) =>
      building != "FNH" &&
      building != "MCML" &&
      building != "Other" &&
      building != "Others"
  );
  if (fnhLevels && fnhLevels.length) {
    fnhLevels.forEach((level) => {
      areas.push("FNH " + level);
    });
  }

  if (mcmlLevels && mcmlLevels.length) {
    mcmlLevels.forEach((level) => {
      areas.push("MCML " + level);
    });
  }

  if (otherAreas) {
    areas.push(otherAreas);
  }

  return areas;
};

const sortRecordsByTime = (records) => {
  records.sort((a, b) => {
    if (moment(a.time, "YYYY-MM-DDTHH:mm").isBefore(moment(b.time, "YYYY-MM-DD HH:mm"))) {
      return -1;
    } else if (moment(a.time, "YYYY-MM-DD HH:mm").isAfter(moment(b.time, "YYYY-MM-DD HH:mm"))) {
      return 1;
    } else {
      return 0;
    }
  });
};

const buildCheckInByBuilding = (records) => {
  return records.reduce(
    (acc, curr) => {
      const mcml = curr.areas.some((area) => area.startsWith("MCML"));
      const fnh = curr.areas.some((area) => area.startsWith("FNH"));
      const farm = curr.areas.includes("UBC Farm");
      const totemField = curr.areas.includes("Totem Field");
      const horticultureGreenhouse = curr.areas.includes("Horticulture Greenhouse");
      const southCampusGreenhouse = curr.areas.includes("South Campus Greenhouse");
      const other = curr.areas.some(
        (area) =>
          !area.startsWith("FNH") &&
          !area.startsWith("MCML") &&
          area !== "UBC Farm" &&
          area !== "Greenhouse"
      );
      if (mcml) {
        acc["MCML"]++;
      }
      if (fnh) {
        acc["FNH"]++;
      }
      if (farm) {
        acc["UBC Farm"]++;
      }
      if (horticultureGreenhouse) {
        acc["Horticulture Greenhouse"]++;
      }
      if (southCampusGreenhouse) {
        acc["South Campus Greenhouse"]++;
      }
      if (totemField) {
        acc["Totem Field"]++;
      }
      if (other) {
        acc["Other Areas"]++;
      }
      return acc;
    },
    {
      FNH: 0,
      MCML: 0,
      "UBC Farm": 0,
      "Totem Field": 0,
      "Horticulture Greenhouse": 0,
      "South Campus Greenhouse": 0,
      "Other Areas": 0,
    }
  );
};

module.exports = {
  downloadResponseReportZIP,
  unzipResponseReport,
  fetchJSONResponseReport,
  getAreaOfActivity,
  sortRecordsByTime,
  buildCheckInByBuilding,
};
