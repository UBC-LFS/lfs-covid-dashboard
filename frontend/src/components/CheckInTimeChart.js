import  React from 'react';
import {Scatter} from 'react-chartjs-2';
import 'chartjs-plugin-zoom';
import moment from 'moment';


export default function CheckInTimeChart({ checkInByTime }) {
  const dataPoints = [];
  for(let time in checkInByTime){
    dataPoints.push({
      x: time,
      y: checkInByTime[time]
    })
  }
  const data =  {
    datasets: [{
      label: 'Total Check-in by Time',
      data: dataPoints,
      backgroundColor: 'rgba(75,192,192,0.4)',
      borderColor: 'rgba(75,192,192,1)',
      pointRadius: 4,
      pointHoverRadius: 8,
      showLine: true,
      lineTension: 0.0,
      fill: false
    }]
  };
  const options = {
    maintainAspectRatio: false,
    responsive: true,
    legend: {
        display: true
    },
    scales: {      
      xAxes: [{     
        type: 'time',
        time: {
          parser: 'YYYY-MM-DDTHH:mm',
          unit: 'hour',
          stepSize: 1,
          displayFormats: {
            hour: 'HH:mm'   
          },          
          tooltipFormat: 'HH:mm'          
        },
        // ticks: {
        //   min: '05:00',
        //   max: '22:00',
        //   callback: (value, index) => index === 24 ? '24:00' : value
        // }
      }],
      yAxes: [{
        ticks: {
          beginAtZero: true,
          stepSize: 5
        }
      }]
    },
    plugins:{
      zoom: {
        zoom: {
          enabled: true,
          mode: 'x',
          rangeMin: {
            x: dataPoints.length ? new Date(dataPoints[0].x) : new Date(moment().startOf('day').format('YYYY-MM-DDTHH:mm')),
          },
          rangeMax: {
            x: dataPoints.length ? new Date(dataPoints[dataPoints.length-1].x) : new Date(moment().endOf('day').format('YYYY-MM-DDTHH:mm')),
          },
        },
        pan: {
          enabled: true,
          mode: 'x',
          rangeMin: {
            x: dataPoints.length ? new Date(dataPoints[0].x) : new Date(moment().startOf('day').format('YYYY-MM-DDTHH:mm')),
          },
          rangeMax: {
            x: dataPoints.length ? new Date(dataPoints[dataPoints.length-1].x) : new Date(moment().endOf('day').format('YYYY-MM-DDTHH:mm')),
          },
        },
      }
    }
  };

  return (
    <Scatter
      height={200}
      data={data}
      options={options}
    />
  )
}