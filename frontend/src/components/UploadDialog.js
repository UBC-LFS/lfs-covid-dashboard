import React, { useState, useCallback } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import Dropzone from "react-dropzone";
import styled from "styled-components";
import Axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { useAppState } from "../appState";
import Backdrop from "@material-ui/core/Backdrop";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";

const getColor = (props) => {
  if (props.isDragAccept) {
    return "#00e676";
  }
  if (props.isDragReject) {
    return "#ff1744";
  }
  if (props.isDragActive) {
    return "#2196f3";
  }
  return "#eeeeee";
};

const Container = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-width: 2px;
  border-radius: 2px;
  border-color: ${(props) => getColor(props)};
  border-style: dashed;
  background-color: #fafafa;
  color: #bdbdbd;
  outline: none;
  transition: border 0.24s ease-in-out;
`;

const useStyles = makeStyles((theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: "#fff",
  },
}));

export default function UploadDialog({ setRefresh }) {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("fnh");
  const [file, setFile] = useState();
  const token = Cookies.get("access_token");
  const { setAuthenticated } = useAppState();
  const [backDrop, setBackDrop] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (event) => {
    setValue(event.target.value);
  };

  const onDrop = useCallback((acceptedFiles) => {
    setFile(acceptedFiles[0]);
  }, []);

  const cancel = () => {
    setFile(null);
    handleClose();
  };

  const upload = () => {
    // Create an object of formData
    const formData = new FormData();

    // Update the formData object
    formData.append("fobdata", file, value);

    // Request made to the backend api
    // Send formData object
    setBackDrop(true);
    Axios.post("/api/fob/upload", formData, {
      withCredentials: true,
      headers: { Authorization: token },
    })
      .then((res) => {
        if (res.status === 200) {
          toast.success("Fob data updated", {
            position: "bottom-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            toastId: "fobdata-updated",
          });
          setRefresh((prevState) => !prevState);
        } else {
          toast.error("Fob data update failed. Please try again", {
            position: "bottom-center",
            autoClose: false,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            toastId: "fobdata-update-failed",
          });
        }
        setBackDrop(false);
      })
      .catch((err) => {
        console.log(err);
        toast.error(
          "Fob data update failed because your session has expired. Please log in to try again.",
          {
            position: "bottom-center",
            autoClose: 7000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: true,
            progress: undefined,
            toastId: "fobdata-update-failed",
            onClose: () => {
              Cookies.remove("access_token");
              setAuthenticated(false);
            },
          }
        );
        setBackDrop(false);
      });

    cancel();
  };

  return (
    <>
      <Button variant="outlined" color="primary" onClick={handleClickOpen}>
        Upload fob data
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="upload-dialog"
        aria-describedby="dialog-for-uploading-fobdata-report"
      >
        <DialogTitle id="upload-dialog">
          {"Upload a fob data report"}
        </DialogTitle>
        <DialogContent>
          <FormControl component="fieldset">
            <FormLabel component="legend">
              Please select the building you are uploading data for:
            </FormLabel>
            <RadioGroup
              row
              aria-label="building"
              name="building1"
              value={value}
              onChange={handleChange}
            >
              <FormControlLabel value="fnh" control={<Radio />} label="FNH" />
              <FormControlLabel value="mcml" control={<Radio />} label="MCML" />
            </RadioGroup>
          </FormControl>
          {file && (
            <DialogContentText id="upload-dialog-filename">
              Selected file: {file.name}
            </DialogContentText>
          )}
          <Dropzone
            accept={[
              ".csv",
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ]}
            onDrop={onDrop}
          >
            {({ getRootProps, getInputProps }) => (
              <section>
                <Container {...getRootProps()}>
                  <input {...getInputProps()} />
                  <p>
                    Drag and drop the fob data excel here, or click to select
                    files
                  </p>
                </Container>
              </section>
            )}
          </Dropzone>
        </DialogContent>
        <DialogActions>
          <Button onClick={upload} color="primary" disabled={!file}>
            Upload
          </Button>
          <Button onClick={cancel} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      <Backdrop className={classes.backdrop} open={backDrop}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}
