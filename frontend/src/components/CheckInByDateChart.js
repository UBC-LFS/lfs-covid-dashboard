import React from "react";
import { Bar } from "react-chartjs-2";
import moment from "moment-timezone";

export default function CheckInByDateChart({ checkInByDate }) {
  const data = {
    labels: checkInByDate.map((date) => date.time),
    datasets: [
      {
        label: "Total Check-in on Date",
        backgroundColor: "rgba(26,141,207,0.2)",
        borderColor: "rgba(26,141,207,1)",
        borderWidth: 1,
        hoverBackgroundColor: "rgba(26,141,207,0.4)",
        hoverBorderColor: "rgba(26,141,207,1)",
        data: checkInByDate.map((date) => date.count),
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    legend: {
      display: true,
    },
    scales: {
      xAxes: [
        {
          ticks: {
            min: moment().startOf("week").format("YYYY-MM-DD"),
            max: moment().endOf("week").format("YYYY-MM-DD"),
            // callback: (value, index) => index === 24 ? '24:00' : value
          },
        },
      ],
      // yAxes: [{
      //   ticks: {
      //     beginAtZero: true,
      //     stepSize: 5
      //   }
      // }]
    },
    plugins: {
      zoom: {
        zoom: {
          enabled: true,
          mode: "x",
          rangeMin: {
            x: new Date(checkInByDate[0].time),
          },
          rangeMax: {
            x: new Date(checkInByDate[checkInByDate.length - 1].time),
          },
        },
        pan: {
          enabled: true,
          mode: "x",
          rangeMin: {
            x: new Date(checkInByDate[0].time),
          },
          rangeMax: {
            x: new Date(checkInByDate[checkInByDate.length - 1].time),
          },
        },
      },
    },
  };

  return <Bar data={data} height={250} options={options} />;
}
