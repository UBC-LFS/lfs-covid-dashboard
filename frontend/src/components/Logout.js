import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogTitle from '@material-ui/core/DialogTitle';
import Cookies from 'js-cookie'
import { useAppState } from '../appState';

export default function Logout({ openLogout, setOpenLogout }) {
  const { setAuthenticated } = useAppState();

  const handleClose = () => {
    setOpenLogout(false);
  };

  const logout = () => {
    handleClose();
    setAuthenticated(false);
    Cookies.remove('access_token');
  };

  return (
    <Dialog
      open={openLogout}
      onClose={handleClose}
    >
      <DialogTitle>{"Are you sure you want to logout?"}</DialogTitle>
      <DialogActions>
        <Button onClick={logout} color="primary" autoFocus>
          Logout
        </Button>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}