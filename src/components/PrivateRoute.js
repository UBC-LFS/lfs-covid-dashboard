import React from "react"
import {
  Route,
  Redirect,
} from 'react-router-dom'
import { useAppState } from '../appState';

export default function PrivateRoute({ component: Component, data, ...rest }) {
  const { authenticated } = useAppState();
  return (
    <Route {...rest} render={(props) => (
      authenticated === true
        ? <Component {...props} {...data}/>
        : <Redirect to={{
            pathname: '/login',
            state: { from: props.location }
          }} />
    )} />
  )
}
  