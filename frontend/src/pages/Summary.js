import React, { useEffect, useState } from "react";
import { makeStyles, Grid, Typography, Box } from "@material-ui/core";
import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";
import ArrowDownwardIcon from "@material-ui/icons/ArrowDownward";
import { DatePicker } from "@material-ui/pickers";
import moment from "moment-timezone";
import MenuDrawer from "../components/MenuDrawer";
import SummaryTable from "../components/SummaryTable";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
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
    margin: 5,
  },
}));

export default function Summary({ summary }) {
  const classes = useStyles();

  const [checkInThisWeek, setCheckInThisWeek] = useState();
  const [checkInLastWeek, setCheckInLastWeek] = useState();

  const [selectedDate, setSelectedDate] = useState(new Date());

  const [totalCheckInThisWeek, setTotalCheckInThisWeek] = useState(0);

  const [averageThisWeek, setAverageThisWeek] = useState(null);
  const [wowTotalCheckIn, setWowTotalCheckIn] = useState(null);
  const [wowAvgCheckIn, setWowAvgCheckIn] = useState(null);

  useEffect(() => {
    const selectedWeek = moment(selectedDate).startOf("week").format("YYYY-MM-DD");
    const lastWeek = moment(selectedWeek).subtract(7, 'days').format("YYYY-MM-DD");
    setCheckInThisWeek(summary[selectedWeek]);
    setCheckInLastWeek(summary[lastWeek]);

    let totCheckInThisWeek = 0;
    let totCheckInLastWeek = 0;
    if (Object.keys(summary).length) {
      if(summary[selectedWeek]){
        for(const day in summary[selectedWeek]){
          totCheckInThisWeek += summary[selectedWeek][day].count;
        }
      }
      if(summary[lastWeek]){
        for(const day in summary[lastWeek]){
          totCheckInLastWeek += summary[lastWeek][day].count;
        }
      }
      setTotalCheckInThisWeek(totCheckInThisWeek);
      const avgThisWeek = summary[selectedWeek] ? Math.round(
        totCheckInThisWeek / Object.keys(summary[selectedWeek]).length
      ) : 0;
      setAverageThisWeek(avgThisWeek);
  
      const averageLastWeek = summary[lastWeek] ?
        totCheckInLastWeek / Object.keys(summary[lastWeek]).length : 0;
      setWowTotalCheckIn(totCheckInLastWeek ? (totCheckInThisWeek - totCheckInLastWeek) / totCheckInLastWeek : null);
      setWowAvgCheckIn(averageLastWeek ? (avgThisWeek - averageLastWeek) / averageLastWeek : null);
    }
  }, [selectedDate]);


  return (
    <div className={classes.root}>
      <MenuDrawer />
      <main className={classes.content}>
        <div className={classes.toolbar} />
        <Typography
          variant="h4"
          gutterBottom
        >{`Summary for The Week of ${moment(selectedDate)
          .startOf("week")
          .format("MMM Do")} - ${moment(selectedDate)
          .endOf("week")
          .format("Do, YYYY")}`}</Typography>
        <Grid container spacing={3}>
          <Grid container item xs={12} spacing={1}>
            <Grid item xs={3} className={classes.borders}>
              <Typography variant="h6" gutterBottom>
                TOTAL CHECK-IN OF WEEK
              </Typography>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {totalCheckInThisWeek}
              </Typography>
              <Box display="flex" alignItems="center">
                {wowTotalCheckIn == null ? null : wowTotalCheckIn >= 0 ? (
                  <ArrowUpwardIcon
                    style={{
                      color: "green",
                      marginRight: "5px",
                      paddingBottom: "2px",
                    }}
                    fontSize="small"
                  />
                ) : (
                  <ArrowDownwardIcon
                    style={{
                      color: "red",
                      marginRight: "5px",
                      paddingBottom: "2px",
                    }}
                    fontSize="small"
                  />
                )}
                <Typography
                  variant="subtitle1"
                  color="textSecondary"
                  style={{ color: `${wowTotalCheckIn >= 0 ? "green" : "red"}` }}
                >
                  {wowTotalCheckIn == null
                    ? ""
                    : `${Math.round(
                        wowTotalCheckIn * 100
                      )}% from prior week`}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3} className={classes.borders}>
              <Typography variant="h6" gutterBottom>
                AVERAGE DAILY CHECK-IN
              </Typography>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {averageThisWeek}
              </Typography>
              <Box display="flex" alignItems="center">
                {wowAvgCheckIn == null ? null : wowAvgCheckIn >= 0 ? (
                  <ArrowUpwardIcon
                    style={{
                      color: "green",
                      marginRight: "5px",
                      paddingBottom: "2px",
                    }}
                    fontSize="small"
                  />
                ) : (
                  <ArrowDownwardIcon
                    style={{
                      color: "red",
                      marginRight: "5px",
                      paddingBottom: "2px",
                    }}
                    fontSize="small"
                  />
                )}
                <Typography
                  variant="subtitle1"
                  color="textSecondary"
                  style={{ color: `${wowAvgCheckIn >= 0 ? "green" : "red"}` }}
                >
                  {wowAvgCheckIn == null
                    ? ""
                    : `${Math.round(wowAvgCheckIn * 100)}% from previous week`}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Box display="flex" justifyContent='flex-end'>
              <DatePicker
                label="Week picker"
                inputVariant="outlined"
                value={selectedDate}
                disableFuture
                format="DD/MM/yyyy"
                views={["year", "month", "date"]}
                onChange={setSelectedDate}
                minDate={moment("2021-01-10").toDate()}
              />
            </Box>
          </Grid>
          <SummaryTable
            date={moment(selectedDate).startOf("week").format("YYYY-MM-DD")}
            checkInThisWeek={checkInThisWeek}
            checkInLastWeek={checkInLastWeek}
          />
        </Grid>
      </main>
    </div>
  );
}
