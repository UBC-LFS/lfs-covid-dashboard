import React from "react";
import { HorizontalBar } from "react-chartjs-2";

export default function BuildingOccupancyChart({
  checkInByArea,
  buildingMaxOccupy,
}) {
  const labels = Object.keys(checkInByArea).length
    ? Object.keys(checkInByArea).sort()
    : Object.keys(buildingMaxOccupy).sort();
  const areaCheckIn = labels.map((label) =>
    checkInByArea[label] ? checkInByArea[label] : 0
  );
  const maxOccupancy = labels.map((label) => buildingMaxOccupy[label]);
  const data = {
    labels,
    datasets: [
      {
        label: "Current Occupant #",
        backgroundColor: "rgba(255,99,132,0.2)",
        borderColor: "rgba(255,99,132,1)",
        borderWidth: 1,
        hoverBackgroundColor: "rgba(255,99,132,0.4)",
        hoverBorderColor: "rgba(255,99,132,1)",
        data: areaCheckIn,
      },
      {
        label: "Max Occupant #",
        backgroundColor: "rgba(255,99,132,0.8)",
        borderColor: "rgba(255,99,132,1)",
        borderWidth: 1,
        hoverBackgroundColor: "rgba(255,99,132,0.4)",
        hoverBorderColor: "rgba(255,99,132,1)",
        data: maxOccupancy,
      },
    ],
  };

  return (
    <HorizontalBar
      height={250}
      data={data}
      options={{
        maintainAspectRatio: false,
      }}
    />
  );
}
