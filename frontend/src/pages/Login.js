import Axios from "axios";
import React, { useState } from "react";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Paper from "@material-ui/core/Paper";
import Box from "@material-ui/core/Box";
import Grid from "@material-ui/core/Grid";
import SchoolIcon from "@material-ui/icons/School";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import { useHistory } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { useAppState } from "../appState";
import "react-toastify/dist/ReactToastify.css";

function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {"Copyright © "}
      <Link color="inherit" href="https://material-ui.com/">
        UBC Faculty of Land and Food Systems
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100vh",
  },
  image: {
    backgroundImage: `url(${process.env.PUBLIC_URL + "/ubc.jpeg"})`,
    backgroundRepeat: "no-repeat",
    backgroundColor:
      theme.palette.type === "light"
        ? theme.palette.grey[50]
        : theme.palette.grey[900],
    backgroundSize: "cover",
    backgroundPosition: "center",
  },
  paper: {
    margin: theme.spacing(8, 4),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
}));

export default function Login() {
  const classes = useStyles();

  let history = useHistory();

  const [cwlId, setCwlId] = useState("");
  const [password, setPassword] = useState("");
  const { setAuthenticated } = useAppState();

  const validateForm = () => {
    return cwlId.length > 0 && password.length > 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    Axios.post(
      "/api/login",
      {
        cwlId,
        password,
      },
      {
        withCredentials: true,
      }
    )
      .then((res) => {
        if (res.status === 200) {
          setAuthenticated(true);
          history.push("/");
          toast.success("Login successful!", {
            position: "bottom-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
          });
        } else {
          loginFailed();
        }
      })
      .catch((err) => {
        console.log(err);
        loginFailed();
      });
  };

  const loginFailed = () => {
    setCwlId("");
    setPassword("");
    setAuthenticated(false);
    toast.error("Login failed. Please try again with valid credentials", {
      position: "bottom-center",
      autoClose: false,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  return (
    <Grid container component="main" className={classes.root}>
      <CssBaseline />
      <Grid item xs={false} sm={4} md={7} className={classes.image} />
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <div className={classes.paper}>
          <Avatar className={classes.avatar}>
            <SchoolIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            UBC LFS Covid-19 Dashboard
          </Typography>
          <form className={classes.form} noValidate onSubmit={handleSubmit}>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="email"
              label="CWL ID"
              name="email"
              autoComplete="email"
              autoFocus
              value={cwlId}
              onChange={(e) => setCwlId(e.target.value)}
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="password"
              label="CWL Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={!validateForm()}
              className={classes.submit}
            >
              Sign In
            </Button>
            <Box mt={5}>
              <Copyright />
            </Box>
            <ToastContainer />
          </form>
        </div>
      </Grid>
    </Grid>
  );
}
