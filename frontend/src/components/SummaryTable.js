import React, { forwardRef } from "react";
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

const columns = [
  { field: "date", title: "Date" },
  { field: "day", title: "Day of Week" },
  { field: "thisWeek", title: "Total" },
  { field: "lastWeek", title: "Total Prev Week" },
  { field: "wow", title: "Week-over-week" },
  { field: "FNH", title: "FNH" },
  { field: "MCML", title: "MCML" },
  { field: "UBC Farm", title: "UBC Farm" },
  { field: "Greenhouse", title: "Greenhouse" },
  { field: "Other Areas", title: "Other Areas" },
];

export default function SummaryTable({ checkInThisWeek, checkInLastWeek }) {
  const data = [];
  for (let day in checkInLastWeek) {
    let wow = null;
    if (typeof checkInThisWeek[day] !== "undefined") {
      wow =
        (checkInThisWeek[day].count - checkInLastWeek[day].count) /
        checkInLastWeek[day].count;
      wow = Math.round(wow * 100) + "%";
    }
    data.push({
      date: moment().day(day).format("MMM Do, YYYY"),
      day,
      thisWeek: checkInThisWeek[day] ? checkInThisWeek[day].count : null,
      lastWeek: checkInLastWeek[day].count,
      wow,
      ...(checkInThisWeek[day] ? checkInThisWeek[day].byBuilding : null),
    });
  }
  return (
    <div style={{ height: 650, width: "100%" }}>
      {checkInThisWeek && checkInLastWeek ? (
        <MaterialTable
          columns={columns}
          data={data}
          options={{
            exportButton: true,
            paging: false,
            search: false,
            showTitle: false,
          }}
          icons={tableIcons}
        />
      ) : null}
    </div>
  );
}
