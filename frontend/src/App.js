import React, { useEffect, useState } from "react";
import Axios from "axios";
import Chart from "chart.js";
import { MuiPickersUtilsProvider } from "@material-ui/pickers";
import {
  createMuiTheme,
  ThemeProvider,
  makeStyles,
} from "@material-ui/core/styles";
import Backdrop from "@material-ui/core/Backdrop";
import CircularProgress from "@material-ui/core/CircularProgress";
import MomentUtils from "@date-io/moment";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Cookies from "js-cookie";

import Home from "./pages/Home";
import Stats from "./pages/Stats";
import Summary from "./pages/Summary";
import Login from "./pages/Login";
import { useAppState } from "./appState";
import PrivateRoute from "./components/PrivateRoute";

Chart.defaults.global.plugins.datalabels.display = false;

const theme = createMuiTheme({
  palette: {
    primary: {
      main: "rgb(12, 35, 68)",
    },
    secondary: {
      light: "rgb(64,180,229)",
      main: "rgb(0,167,225)",
      dark: "rgb(0,85,183)",
    },
  },
});

const useStyles = makeStyles((theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: "#fff",
  },
}));

export default function App() {
  const [checkInRecords, setCheckInRecords] = useState({});
  const [checkOutRecords, setCheckOutRecords] = useState({});
  const [stats, setStats] = useState({});
  const [summary, setSummary] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const classes = useStyles();
  const { setAuthenticated } = useAppState();
  const token = Cookies.get("access_token");

  useEffect(() => {
    if (token) {
      Axios.get("http://localhost:8080/api/covid", {
        withCredentials: true,
        headers: { Authorization: token },
      })
        .then((res) => {
          setAuthenticated(true);
          const {
            data: { checkInRecords, checkOutRecords, stats, summary },
          } = res;
          setCheckInRecords(checkInRecords);
          setCheckOutRecords(checkOutRecords);
          setStats(stats);
          setSummary(summary);
          setIsLoading(false);
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      setAuthenticated(false);
      setIsLoading(false);
    }
  }, [token, setAuthenticated]);

  return isLoading ? (
    <Backdrop className={classes.backdrop} open={isLoading}>
      <CircularProgress color="inherit" />
    </Backdrop>
  ) : (
    <ThemeProvider theme={theme}>
      <MuiPickersUtilsProvider utils={MomentUtils}>
        <Router>
          <Switch>
            <Route path="/login">
              <Login />
            </Route>
            <PrivateRoute path="/stats" component={Stats} data={{ stats }} />
            <PrivateRoute
              path="/summary"
              component={Summary}
              data={{ summary }}
            />
            <PrivateRoute
              path="/"
              component={Home}
              data={{ checkInRecords, checkOutRecords }}
            />
          </Switch>
        </Router>
      </MuiPickersUtilsProvider>
    </ThemeProvider>
  );
}
