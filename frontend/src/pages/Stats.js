import React, { useEffect, useState } from "react";
import {
  makeStyles,
  Grid,
  Typography,
  Card,
  CardContent,
  CardMedia,
} from "@material-ui/core";

import MenuDrawer from "../components/MenuDrawer";
import BuildingOccupancyChart from "../components/BuildingOccupancyChart";
import CheckInTimeChart from "../components/CheckInTimeChart";
import CheckInByDateChart from "../components/CheckInByDateChart";
import CheckInByBuilding from "../components/CheckInByBuilding";
import Axios from "axios";
import { startCase } from "lodash";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    justifyContent: "space-between",
  },
  details: {
    display: "flex",
    flexDirection: "column",
  },
  cardContent: {
    flex: "1 0 auto",
  },
  cover: {
    width: 151,
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
    minWidth: 260,
  },
}));

export default function Stats({ stats }) {
  const classes = useStyles();
  const {
    numCheckInToday,
    numCheckOutToday,
    numCheckInLast7Days,
    numCheckInLast31Days,
    checkInByArea,
    checkInByBuilding,
    checkInByTime,
    checkInByDate,
    buildingMaxOccupy,
    bcCovidStats,
  } = stats;

  const [weather, setWeather] = useState({});

  useEffect(() => {
    Axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=Vancouver&units=metric&appid=${process.env.REACT_APP_OPEN_WEATHER_APP_API_KEY}`
    )
      .then((res) => {
        const { data } = res;
        const { weather, main, name } = data;
        setWeather({
          city: name,
          temperature: main.temp,
          feelsLike: main.feels_like,
          humidity: main.humidity,
          description: weather[0].description,
          icon: `http://openweathermap.org/img/wn/${weather[0].icon}@2x.png`,
        });
      })
      .catch((err) => {
        setWeather({
          name: "Unable to Load Weather Info",
        });
      });
  }, []);
  return (
    <div className={classes.root}>
      <MenuDrawer />
      <main className={classes.content}>
        <div className={classes.toolbar} />
        <Grid container spacing={1}>
          <Grid container item xs={12} spacing={1}>
            <Grid item xs={2} className={classes.borders}>
              <Typography variant="h6" gutterBottom>
                CHECK-IN TODAY
              </Typography>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {numCheckInToday}
              </Typography>
            </Grid>
            <Grid item xs={2} className={classes.borders}>
              <Typography variant="h6" gutterBottom>
                CHECK-IN PAST 7 DAYS
              </Typography>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {numCheckInLast7Days}
              </Typography>
            </Grid>
            <Grid item xs={2} className={classes.borders}>
              <Typography variant="h6" gutterBottom>
                CHECK-IN PAST 30 DAYS
              </Typography>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {numCheckInLast31Days}
              </Typography>
            </Grid>
            <Grid item xs={2} className={classes.borders}>
              <Typography variant="h6" gutterBottom>
                CHECK-OUT TODAY
              </Typography>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {numCheckOutToday}
              </Typography>
            </Grid>
            <Grid item xs={2} className={classes.borders}>
              {bcCovidStats && Object.keys(bcCovidStats).length ? (
                <>
                  <Typography variant="h6">BC COVID-19 STATS</Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    New Cases: {bcCovidStats.change_cases}
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    Total Cases: {bcCovidStats.total_cases}
                  </Typography>
                </>
              ) : (
                <Typography variant="h6" gutterBottom>
                  Loading BC Covid-19 Stats...
                </Typography>
              )}
            </Grid>
          </Grid>
          <Grid container item xs={12} spacing={1}>
            <Grid item xs={5}>
              {checkInByArea ? (
                <BuildingOccupancyChart
                  checkInByArea={checkInByArea}
                  buildingMaxOccupy={buildingMaxOccupy}
                />
              ) : null}
            </Grid>
            <Grid container item xs={7} spacing={2}>
              <Grid item xs={6}>
                {checkInByTime ? (
                  <CheckInTimeChart checkInByTime={checkInByTime} />
                ) : null}
              </Grid>
              <Grid item xs={6}>
                {checkInByBuilding ? (
                  <CheckInByBuilding checkInByBuilding={checkInByBuilding} />
                ) : null}
              </Grid>
              <Grid item xs={6}>
                {checkInByDate ? (
                  <CheckInByDateChart checkInByDate={checkInByDate} />
                ) : null}
              </Grid>
              <Grid
                item
                xs={6}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {Object.keys(weather).length ? (
                  <Card className={classes.root}>
                    <div className={classes.details}>
                      <CardContent className={classes.cardContent}>
                        <Typography variant="h5">{weather.city}</Typography>
                        <Typography variant="h6">
                          {startCase(weather.description)}
                        </Typography>
                        <Typography variant="subtitle1">
                          Temperature: {weather.temperature}&deg;C
                        </Typography>
                        <Typography variant="subtitle1">
                          Feels Like: {weather.feelsLike}&deg;C
                        </Typography>
                        <Typography variant="subtitle1">
                          Humidity: {weather.humidity}%
                        </Typography>
                      </CardContent>
                    </div>
                    <CardMedia
                      className={classes.cover}
                      image={weather.icon}
                      title="Weather"
                      height="140"
                    />
                  </Card>
                ) : (
                  <Typography variant="h5">Loading Weather...</Typography>
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </main>
    </div>
  );
}
