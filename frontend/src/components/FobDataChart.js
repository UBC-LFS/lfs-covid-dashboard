import React from "react";
import { HorizontalBar } from "react-chartjs-2";
import { Grid } from "@material-ui/core";
import "chartjs-plugin-annotation";

export default function FobDataChart({ data }) {
  const labels = data.map((day) => day.date);
  const fnhCheckIn = data.map((day) => day.FNH);
  const fnhFobIn = data.map((day) => day.fnhFob);
  const mcmlCheckIn = data.map((day) => day.MCML);
  const mcmlFobIn = data.map((day) => day.mcmlFob);

  const fnhDataArr = [fnhCheckIn, fnhFobIn];
  const mcmlDataArr = [mcmlCheckIn, mcmlFobIn];

  const baseData = [
    {
      label: "Check-in #",
      backgroundColor: "rgba(255,99,132,0.2)",
      borderColor: "rgba(255,99,132,1)",
      borderWidth: 1,
      hoverBackgroundColor: "rgba(255,99,132,0.4)",
      hoverBorderColor: "rgba(255,99,132,1)",
    },
    {
      label: "Fob-in #",
      backgroundColor: "rgba(255,99,132,0.8)",
      borderColor: "rgba(255,99,132,1)",
      borderWidth: 1,
      hoverBackgroundColor: "rgba(255,99,132,0.4)",
      hoverBorderColor: "rgba(255,99,132,1)",
    },
  ];
  const fnhChartData = {
    labels,
    datasets: baseData.map((val, idx) => {
      return {
        ...val,
        data: fnhDataArr[idx],
      };
    }),
  };
  const mcmlChartData = {
    labels,
    datasets: baseData.map((val, idx) => {
      return {
        ...val,
        data: mcmlDataArr[idx],
      };
    }),
  };

  return (
    <>
      <Grid item xs={6}>
        <HorizontalBar
          data={fnhChartData}
          options={{
            title: {
              display: true,
              text: "FNH",
              fontSize: 18,
            },
            maintainAspectRatio: false,
            annotation: {
              annotations: [
                {
                  type: "line",
                  mode: "vertical",
                  scaleID: "x-axis-0",
                  value: "109",
                  borderColor: "red",
                  label: {
                    content: "Max Occupant: 109",
                    enabled: true,
                    position: "top",
                  },
                },
              ],
            },
          }}
        />
      </Grid>
      <Grid item xs={6}>
        <HorizontalBar
          height={250}
          data={mcmlChartData}
          options={{
            title: {
              display: true,
              text: "MCML",
              fontSize: 18,
            },
            scales: {
              xAxes: [
                {
                  ticks: {
                    min: 0,
                    max: 130,
                  },
                },
              ],
            },
            maintainAspectRatio: false,
            annotation: {
              annotations: [
                {
                  type: "line",
                  mode: "vertical",
                  scaleID: "x-axis-0",
                  value: "116",
                  borderColor: "red",
                  label: {
                    content: "Max Occupant: 116",
                    enabled: true,
                    position: "top",
                  },
                },
              ],
            },
          }}
        />
      </Grid>
    </>
  );
}
