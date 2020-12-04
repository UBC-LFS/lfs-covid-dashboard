import  React from 'react';
import { makeStyles, Grid, Typography, Box } from '@material-ui/core';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import moment from 'moment';
import MenuDrawer from './MenuDrawer';
import SummaryTable from './SummaryTable';

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
  borders: {
    border: "1px solid #e0e0e0",
    margin: 5
  }
}));

export default function Summary({ summary }) {
  const classes = useStyles();
  const { checkInThisWeek, checkInLastWeek, totalCheckInThisWeek, totalCheckInLastWeek } = summary;

  let averageThisWeek = null;
  let wowTotalCheckIn = null;
  let wowAvgCheckIn = null;

  if(Object.keys(summary).length){
    averageThisWeek = Math.round(totalCheckInThisWeek / Object.keys(checkInThisWeek).length);
    let averageLastWeek = totalCheckInLastWeek / Object.keys(checkInLastWeek).length
 
    wowTotalCheckIn = (totalCheckInThisWeek - totalCheckInLastWeek) / totalCheckInLastWeek;
    wowAvgCheckIn = (averageThisWeek - averageLastWeek) / averageLastWeek;
  }


  return (
    <div className={classes.root}>
      <MenuDrawer />
      <main className={classes.content}>
        <div className={classes.toolbar} />
        <Typography variant='h4' gutterBottom>{`Summary for The Week of ${moment().startOf('week').format('MMM Do')} - ${moment().endOf('week').format('Do, YYYY')}`}</Typography>
        <Grid container spacing={1}>
          <Grid container item xs={12} spacing={1}>
              <Grid item xs={3} className={classes.borders}>
                <Typography variant='h6' gutterBottom>TOTAL CHECK-IN THIS WEEK</Typography>
                <Typography variant="h6" color='textSecondary' gutterBottom>
                  {totalCheckInThisWeek}
                </Typography>
                <Box display="flex" alignItems="center">
                  {wowTotalCheckIn == null ? null :wowTotalCheckIn >= 0 ? 
                    <ArrowUpwardIcon style={{ color: "green", marginRight: "5px", paddingBottom: "2px" }} fontSize="small"/> :
                    <ArrowDownwardIcon style={{ color: "red", marginRight: "5px", paddingBottom: "2px" }} fontSize="small"/>
                  }
                  <Typography variant="subtitle1" color='textSecondary' style={{ color: `${wowTotalCheckIn >= 0 ? "green" : "red"}`}}>
                  {wowTotalCheckIn == null ? "" : `${Math.round(wowTotalCheckIn * 100)}% from previous week` }
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3} className={classes.borders}>
                <Typography variant='h6' gutterBottom>AVERAGE DAILY CHECK-IN</Typography>
                <Typography variant="h6" color='textSecondary' gutterBottom>
                  {averageThisWeek}
                </Typography>
                <Box display="flex" alignItems="center">
                  {wowAvgCheckIn == null ? null : wowAvgCheckIn >= 0 ? 
                    <ArrowUpwardIcon style={{ color: "green", marginRight: "5px", paddingBottom: "2px" }} fontSize="small"/> :
                    <ArrowDownwardIcon style={{ color: "red", marginRight: "5px", paddingBottom: "2px" }} fontSize="small"/>
                  }
                  <Typography variant="subtitle1" color='textSecondary' style={{ color: `${wowAvgCheckIn >= 0 ? "green" : "red"}`}}>
                    {wowAvgCheckIn == null ? "" : `${Math.round(wowAvgCheckIn * 100)}% from previous week` }
                  </Typography>
                </Box>
              </Grid>
          </Grid>
          <Grid item xs={12}>
            <SummaryTable checkInThisWeek={checkInThisWeek} checkInLastWeek={checkInLastWeek}/>
          </Grid>
        </Grid>
      </main>
    </div>
  )
}