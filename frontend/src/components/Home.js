import  React, { useState, useEffect } from 'react';
import { makeStyles, Typography, Select, MenuItem, Box } from '@material-ui/core';
import { DatePicker } from '@material-ui/pickers';
import isEmpty from 'lodash/isEmpty'
import moment from 'moment-timezone';
import { ToastContainer } from 'react-toastify';


import MenuDrawer from './MenuDrawer';
import SurveyDataTable from './SurveyDataTable';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
}));

export default function Home({ checkInRecords, checkOutRecords }) {
  const classes = useStyles();
  const [surveyType, setSurveyType] = React.useState('in');
  const [selectedDate, handleDateChange] = useState(new Date());
  const [records, setRecords] = useState([]);
  
  const handleChange = (event) => {
    setSurveyType(event.target.value);
  };

  useEffect(() => {
    const date = moment(selectedDate);
    let selectedRecords = surveyType === 'in' ? checkInRecords : checkOutRecords;
    if(selectedRecords && Object.keys(selectedRecords).length){
      const recordsOnDay = selectedRecords[date.year()][date.month()+1][date.date()] || [];
      setRecords(recordsOnDay.map(record => {
        return {
          ...record,
          time: moment(record.time).format("HH:mm"),
          areas: record.areas.join(", ")
        };
      }))
    }
  }, [surveyType, selectedDate, checkInRecords, checkOutRecords]);

  return (
    <div className={classes.root}>
      <MenuDrawer />
      <main className={classes.content}>
        <div className={classes.toolbar} />
        <Box display='flex' alignItems="center" m={1}>
          <Box p={1} flexGrow={1}>
            <Typography variant='h4'>{`Survey Data for ${moment(selectedDate).format("MMM Do, YYYY") }`}</Typography>
          </Box>
          <Select
            id="survey-type"
            value={surveyType}
            onChange={handleChange}
            variant='outlined'
          >
            <MenuItem value={'in'}>Check-in</MenuItem>
            <MenuItem value={'out'}>Check-out</MenuItem>
          </Select>
          <Box px={3}>
            <DatePicker 
              inputVariant="outlined" 
              value={selectedDate} 
              disableFuture
              format="DD/MM/yyyy"
              views={["year", "month", "date"]}
              onChange={handleDateChange} 
              minDate={surveyType === 'in' ? moment('2020-10-17').toDate() : moment('2020-11-22').toDate()}  
            />
          </Box>
        </Box>
        { isEmpty(checkInRecords) ? null : <SurveyDataTable records={records} surveyType={surveyType} />}
        <ToastContainer />
      </main>
    </div>
  )
}

