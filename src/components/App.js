import React, { useEffect, useState } from 'react';
import Axios from 'axios';
import Chart from 'chart.js';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import { createMuiTheme, ThemeProvider, makeStyles  } from '@material-ui/core/styles';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import MomentUtils from '@date-io/moment';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

import Home from './Home'
import Stats from './Stats';
import Summary from './Summary';
import Login from './Login';

Chart.defaults.global.plugins.datalabels.display = false

const theme = createMuiTheme({
  palette: {
    primary: {
      main: 'rgb(12, 35, 68)'
    },
    secondary: {
      light: 'rgb(64,180,229)',
      main: 'rgb(0,167,225)',
      dark: 'rgb(0,85,183)',
    }
  },
});

const useStyles = makeStyles((theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
}));

export default function App() {
  const [checkInRecords, setCheckInRecords] = useState({});
  const [checkOutRecords, setCheckOutRecords] = useState({});
  const [stats, setStats] = useState({});
  const [summary, setSummary] = useState({});
  const [backdrop, setBackdrop] = useState(true);
  const classes = useStyles();

  useEffect(() => {
    Axios.get('http://localhost:4000/api/covid').then((res) => {
      const { data: { checkInRecords, checkOutRecords, stats, summary} } = res;
      setCheckInRecords(checkInRecords);
      setCheckOutRecords(checkOutRecords);
      setStats(stats);
      setSummary(summary);
      setBackdrop(false);
    }).catch((err) => {
      console.log(err)
    })
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <MuiPickersUtilsProvider utils={MomentUtils}>
        <Backdrop className={classes.backdrop} open={backdrop}>
          <CircularProgress color="inherit" />
        </Backdrop>
        <Router>
          <Switch>
            <Route path="/login">
              <Login/>
            </Route>
            <Route path="/stats">
              <Stats stats={stats}/>
            </Route >
            <Route path="/summary">
              <Summary summary={summary}/>
            </Route >
            <Route path="/">
              <Home checkInRecords={checkInRecords} checkOutRecords={checkOutRecords}/>
            </Route>
          </Switch>
        </Router>
      </MuiPickersUtilsProvider>
    </ThemeProvider>
  );
}
