import React from "react";
import { Route, Redirect } from "react-router-dom";
import { useAppState } from "../appState";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import jwt_decode from "jwt-decode";
import moment from "moment-timezone";

export default function PrivateRoute({ component: Component, data, ...rest }) {
  const { authenticated, setAuthenticated } = useAppState();
  const token = Cookies.get("access_token");
  if (
    !token ||
    moment.unix(jwt_decode(token).exp).isBefore(moment(), "second")
  ) {
    setAuthenticated(false);
    Cookies.remove("access_token");
    toast.warn("Session expired. Please log in again.", {
      position: "bottom-center",
      autoClose: false,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      toastId: "session-expired",
    });
  }

  return (
    <Route
      {...rest}
      render={(props) =>
        authenticated === true ? (
          <Component {...props} {...data} />
        ) : (
          <Redirect
            to={{
              pathname: "/login",
              state: { from: props.location },
            }}
          />
        )
      }
    />
  );
}
