const { createResponseExport, getResponseExportProgress, getResponseExportFile } = require('node-qualtrics-api')

const fs = require('fs')
const JSZip = require('jszip')
const moment = require('moment')

/**
 * Donwloads a compressed file containing a new response export
 * @param {String} survey name of the survey
 * @param {String} format file format (can be csv, tsv, spss, json, ndjson, or xml)
 * @param {String} fileName name of output file
 * @return {Promise} A promise that resolves to an object containing the compressed folder's name
*/
const downloadResponseReportZIP = async (survey, format, fileName) => {
  let exportProgressId

  // initiate the response export
  const responseExport = await createResponseExport(survey, format)

  // if the export was initiated successfully, get progress ID
  if (responseExport.result && responseExport.result.progressId) {
    exportProgressId = responseExport.result.progressId

    let exportStatus

    // get the response progress
    let responseExportProgress = await getResponseExportProgress(survey, exportProgressId)

    if (responseExportProgress.result) {
      exportStatus = responseExportProgress.result.status

      // check export status until it completes or fails
      while (exportStatus !== 'complete') {
        responseExportProgress = await getResponseExportProgress(survey, exportProgressId)
        exportStatus = responseExportProgress.result.status

        if (exportStatus === 'failed' || typeof exportStatus === 'undefined') {
          return { error: true, description: 'Qualtrics export failed' }
        }
      }

      const { fileId } = responseExportProgress.result
      const exportFile = await getResponseExportFile(survey, fileId)

      if (Buffer.isBuffer(exportFile)) {
        console.log('Creating zip file...')

        // remove spaces from filename
        fileName = fileName.replace(' ', '')
        const zipFileName = /.zip$/.test(fileName) ? fileName : fileName + '.zip'

        // create zip file containing the response report
        fs.writeFileSync(zipFileName, exportFile)

        console.log('Zip file created successfully.\n')
        return { error: false, description: 'Zip file created successfully.', fileName: zipFileName }
      }
    }
  }
}

/**
 * Donwloads a compressed file containing a new response export
 * @param {String} filePath relative path to file
*/
const unzipResponseReport = async (filePath) => {
  // check that the file requested is a zip file
  const zipFileName = filePath.match(/[a-z0-9_-]\.zip$/i)

  // check if a zip file was correctly included at the end of the path
  if (!zipFileName) { throw new Error('invalid .zip file path ' + `[ ${filePath} ]\n`) }

  console.log('Unzipping folder...')

  const data = fs.readFileSync(filePath)

  const zip = new JSZip()

  const contents = await zip.loadAsync(data)

  for (const filename of Object.keys(contents.files)) {
    const content = await zip.file(filename).async('nodebuffer')
    fs.writeFileSync(filename, content)
  }

  console.log('Folder unzipped successfully.\n')
}

/**
 * Donwloads a JSON file containing all responses
 * @param {String} surveyName name of the survey whose responses are being requested
 * @return {Promise} promise that resolves to a JSON object containing response export data
*/
const fetchJSONResponseReport = async (surveyName) => {
  // download the file from qualtrics
  const download = await downloadResponseReportZIP(surveyName, 'json', surveyName)

  // on the event of a download error, throw the error
  if (download.error) { throw download.error }

  // unzip the response report compressed folder
  await unzipResponseReport(download.fileName)

  // get the file contents and return
  return JSON.parse(fs.readFileSync(surveyName + '.json'))
}

const getCheckInAreaOfActivity = (buildings, fnhLevels, mcmlLevels, otherAreas) => {
  const areas = buildings.filter(building => building != 'FNH' && building != 'MCML' && building != 'Other');
  if (fnhLevels && fnhLevels.length) {
    fnhLevels.forEach(level => {
      areas.push('FNH ' + level);
    });
  }

  if (mcmlLevels && mcmlLevels.length) {
    mcmlLevels.forEach(level => {
      areas.push('MCML ' + level);
    });
  }

  if (otherAreas) {
    areas.push(otherAreas);
  }

  return areas;
}

const getCheckOutAreaOfActivity = (rawAreas) => {
  const {
    buildings, 
    fnhAreas, 
    mcmlAreas, 
    commonAreas,
    otherFnhAreas, 
    otherMcmlAreas, 
    otherBuildings, 
    otherCommonAreas
  } = rawAreas;

  const areas = buildings.filter(building => building != 'Others');
  
  if (otherBuildings) {
    areas.push(`Other Building(s):(${otherBuildings})`);
  }

  if(commonAreas && commonAreas.length){
    areas.push(...commonAreas.filter(area => area != 'Others'));
  }

  if (otherCommonAreas) {
    areas.push(`Other Common Area(s):(${otherCommonAreas})`);
  }

  if (fnhAreas && fnhAreas.length){
    let idx = areas.indexOf("FNH");
    areas.splice(idx, 1);
    if(fnhAreas.includes("Elevator")) {
      idx = fnhAreas.indexOf("Elevator")
      fnhAreas[idx] = "FNH Elevator";
    }
    if (fnhAreas.includes("Others")) {
      idx = fnhAreas.indexOf("Others")
      if (otherFnhAreas) {
        fnhAreas.splice(idx, 1, `FNH:(${otherFnhAreas})`);
      } else {
        fnhAreas.splice(idx, 1);
      }
    }
    areas.push(...fnhAreas);
  }

  if (mcmlAreas && mcmlAreas.length) {
    let idx = areas.indexOf("MCML");
    areas.splice(idx, 1);
    if (mcmlAreas.includes("Elevator")) {
      let idx = mcmlAreas.indexOf("Elevator")
      mcmlAreas[idx] = "MCML Elevator";
    }

    if (mcmlAreas.includes("Others")) {
      let idx = mcmlAreas.indexOf("Others")
      if (otherMcmlAreas) {
        mcmlAreas.splice(idx, 1, `MCML:(${otherMcmlAreas})`);
      } else {
        mcmlAreas.splice(idx, 1);
      }
    }
    areas.push(...mcmlAreas);
  }

  return areas;
}

const sortRecordsByTime = (records) => {
  records.sort((a, b) => {
    if(moment(a.time).isBefore(moment(b.time))){
      return -1;
    } else if (moment(a.time).isAfter(moment(b.time))) {
      return 1;
    } else {
      return 0;
    }
  });
} 

const buildCheckInByBuilding = (records) => {
  return records.reduce((acc, curr) => {
    const mcml = curr.areas.some(area => area.startsWith('MCML'));
    const fnh = curr.areas.some(area => area.startsWith('FNH'));
    const farm = curr.areas.includes('UBC Farm');
    const greenhouse = curr.areas.includes('Greenhouse');
    const other = curr.areas.some(area => !area.startsWith('FNH') && !area.startsWith('MCML') && area !== 'UBC Farm' && area !== 'Greenhouse');
    if(mcml){
      acc['MCML']++;
    }
    if(fnh){
      acc['FNH']++;
    }
    if(farm){
      acc['UBC Farm']++;
    }
    if(greenhouse){
      acc['Greenhouse']++;
    }
    if(other){
      acc['Other Areas']++;
    }
    return acc;
  }, {
    'FNH': 0,
    'MCML': 0,
    'UBC Farm': 0,
    'Greenhouse': 0,
    'Other Areas': 0
  });
}

module.exports = { downloadResponseReportZIP, unzipResponseReport, fetchJSONResponseReport, getCheckInAreaOfActivity, getCheckOutAreaOfActivity, sortRecordsByTime, buildCheckInByBuilding }
