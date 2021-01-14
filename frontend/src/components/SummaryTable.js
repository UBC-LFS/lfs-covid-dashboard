import Axios from "axios";
import React, { forwardRef, useState, useEffect, useCallback } from "react";
import moment from "moment-timezone";
import MaterialTable from "material-table";
import AddBox from "@material-ui/icons/AddBox";
import ArrowDownward from "@material-ui/icons/ArrowDownward";
import Check from "@material-ui/icons/Check";
import ChevronLeft from "@material-ui/icons/ChevronLeft";
import ChevronRight from "@material-ui/icons/ChevronRight";
import Clear from "@material-ui/icons/Clear";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import Edit from "@material-ui/icons/Edit";
import FilterList from "@material-ui/icons/FilterList";
import FirstPage from "@material-ui/icons/FirstPage";
import LastPage from "@material-ui/icons/LastPage";
import Remove from "@material-ui/icons/Remove";
import SaveAlt from "@material-ui/icons/SaveAlt";
import Search from "@material-ui/icons/Search";
import ViewColumn from "@material-ui/icons/ViewColumn";
import FobDataChart from "./FobDataChart";
import { Grid } from "@material-ui/core";
import { ToastContainer, toast } from "react-toastify";
import Cookies from "js-cookie";

const tableIcons = {
  Add: forwardRef((props, ref) => <AddBox {...props} ref={ref} />),
  Check: forwardRef((props, ref) => <Check {...props} ref={ref} />),
  Clear: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Delete: forwardRef((props, ref) => <DeleteOutline {...props} ref={ref} />),
  DetailPanel: forwardRef((props, ref) => (
    <ChevronRight {...props} ref={ref} />
  )),
  Edit: forwardRef((props, ref) => <Edit {...props} ref={ref} />),
  Export: forwardRef((props, ref) => <SaveAlt {...props} ref={ref} />),
  Filter: forwardRef((props, ref) => <FilterList {...props} ref={ref} />),
  FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref} />),
  LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
  NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
  PreviousPage: forwardRef((props, ref) => (
    <ChevronLeft {...props} ref={ref} />
  )),
  ResetSearch: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Search: forwardRef((props, ref) => <Search {...props} ref={ref} />),
  SortArrow: forwardRef((props, ref) => <ArrowDownward {...props} ref={ref} />),
  ThirdStateCheck: forwardRef((props, ref) => <Remove {...props} ref={ref} />),
  ViewColumn: forwardRef((props, ref) => <ViewColumn {...props} ref={ref} />),
};

const columns = () => [
  { field: "date", title: "Date", editable: 'never' },
  { field: "day", title: "Day of Week", editable: 'never' },
  { field: "thisWeek", title: "Total", editable: 'never' },
  { field: "lastWeek", title: "Total Prev Week", editable: 'never' },
  { field: "wow", title: "Week-over-week", editable: 'never' },
  { field: "FNH", title: "FNH", editable: 'never' },
  { field: "MCML", title: "MCML", editable: 'never' },
  { field: "UBC Farm", title: "UBC Farm", editable: 'never' },
  { field: "Totem Field", title: "Totem Field", editable: 'never' },
  { field: "Horticulture Greenhouse", title: "Horticulture Greenhouse", editable: 'never' },
  { field: "South Campus Greenhouse", title: "South Campus Greenhouse", editable: 'never' },
  { field: "Other Areas", title: "Other Areas", editable: 'never' },
  { field: "fnhFob", title: "FNH FOB Data" },
  { field: "mcmlFob", title: "MCML FOB Data" }
];

export default function SummaryTable({ date, checkInThisWeek, checkInLastWeek }) {
  const token = Cookies.get("access_token");
  const [data, setData] = useState([]);

  const queryFobData = useCallback(async (date) => {
    try {
      const res = await Axios.post(
        "http://localhost:8080/api/fob/query",
        {
          week: date
        },
        {
          withCredentials: true,
          headers: { Authorization: token },
        }
      );
      if (res.status === 200) {
        return res.data.fobData || {};
      } else {
        toast.error("Query for fob data failed", {
          position: "bottom-center",
          autoClose: false,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
      }
    } catch (err) {
      console.log(err);
      toast.error("Query for fob data failed 1", {
        position: "bottom-center",
        autoClose: false,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }
  }, [token]);

  useEffect(() => {
    queryFobData(date).then(({ data: fobData }) => {
      let tempArr = [];
      for (let day in checkInThisWeek) {
        let wow = checkInLastWeek && checkInLastWeek[day] ?
          (checkInThisWeek[day].count - checkInLastWeek[day].count) /
          checkInLastWeek[day].count : 0;
        wow = Math.round(wow * 100) + "%";
        let fnhFob = 0;
        let mcmlFob = 0;
        if(fobData && fobData[moment(day).format("MMM Do, YYYY")]){
          ({ fnhFob, mcmlFob } = JSON.parse(fobData[moment(day).format("MMM Do, YYYY")]));
          
        }
        let temp = {
          date: moment(day).format("MMM Do, YYYY"),
          day: moment(day).format("dddd"),
          thisWeek: checkInThisWeek[day].count,
          lastWeek: checkInLastWeek && checkInLastWeek[day] ? checkInLastWeek[day].count : null,
          wow,
          fnhFob,
          mcmlFob,
          ...checkInThisWeek[day].byBuilding,
        }
        tempArr.push(temp);
      }
      setData(tempArr);
    });
  }, [date, checkInThisWeek, checkInLastWeek, queryFobData])

  const updateFobData = ({week, newData}) => {
    Axios.post(
      "http://localhost:8080/api/fob/update",
      {
        week,
        newData
      },
      {
        withCredentials: true,
        headers: { Authorization: token },
      }
    )
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
          });
        } else {
          toast.error("Fob data update failed", {
            position: "bottom-center",
            autoClose: false,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
          });
        }
      })
      .catch((err) => {
        console.log(err);
        toast.error("Fob data update failed 1", {
          position: "bottom-center",
          autoClose: false,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
      });
  }

  return (
    <>
      <FobDataChart data={data}/>
      <Grid item xs={12}>
        <div style={{ width: "100%" }}>
          {checkInThisWeek ? (
            <MaterialTable
              localization={{
                header : {
                  actions: ''
                }
              }}
              columns={columns()}
              data={data}
              options={{
                exportButton: true,
                paging: false,
                search: false,
                showTitle: false,
              }}
              icons={tableIcons}
              // cellEditable={{
              //   cellStyle: {},
              //   onCellEditApproved: (newValue, oldValue, rowData, columnDef) => {
              //       return new Promise((resolve, reject) => {
              //           setData(prevData => prevData.map(day => {
              //             return day.date === rowData.date ? {
              //               ...rowData,
              //               [columnDef.field]: newValue,
              //             } : day
              //           }))
              //           console.log(newValue, oldValue, rowData, columnDef)
              //           resolve();
              //       });
              //   },
              // }}
              editable={{
                isDeleteHidden: rowData => true,
                onBulkUpdate: changes => 
                  new Promise((resolve, reject) => {
                      let changeArr = [];
                      for(const change in changes){
                        const { newData: { date, fnhFob, mcmlFob } } = changes[change];
                        changeArr.push([date, JSON.stringify({
                          fnhFob: parseInt(fnhFob),
                          mcmlFob: parseInt(mcmlFob)
                        })]);
                      }
                      const fobMap = new Map(changeArr);
                      data.forEach(day => {
                        if(!fobMap.has(day.date)){
                          fobMap.set(day.date, JSON.stringify({
                            fnhFob: day.fnhFob,
                            mcmlFob: day.mcmlFob
                          }))
                        }
                      })
                      updateFobData({week: date, newData: JSON.stringify([...fobMap])});
                      setData(prevData => prevData.map(day => {
                        const { fnhFob, mcmlFob } = JSON.parse(fobMap.get(day.date));
                        return {
                          ...day,
                          fnhFob,
                          mcmlFob
                        }
                      }))
                      resolve();
                }),
                onRowDelete: oldData =>
                  new Promise((resolve, reject) => {
                    resolve();
                  })
              }}
            />
          ) : null}
        </div>
      </Grid>
      <ToastContainer />
    </>
  );
}
