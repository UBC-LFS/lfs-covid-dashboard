import React from 'react';
import {Pie} from 'react-chartjs-2';
import 'chartjs-plugin-datalabels';


export default function CheckInByBuilding({ checkInByBuilding }){
	const colors = Object.keys(checkInByBuilding).map(
		building => {
			switch(building){
				case "UBC Farm":
					return "#00e676";
				case "MCML":
					return "#aa2e25";
				case "FNH":
					return "#2196f3";
				case "Greenhouse":
					return "#ff1744";
				default:
					return "#ff9100";
			}
		}
	)
	const data = {
		labels: Object.keys(checkInByBuilding),
		datasets: [{
			data: Object.values(checkInByBuilding),
			backgroundColor: colors,
			hoverBackgroundColor: colors
		}]
	};

  return (
    <Pie 
      data={data} 
      options={{
				// maintainAspectRatio: false,
				// plugins: {
				// 	datalabels: {
				// 		formatter: (value, ctx) => {
				// 			let sum = 0;
				// 			let dataArr = ctx.chart.data.datasets[0].data;
				// 			dataArr.map(data => {
				// 					sum += data;
				// 			});
				// 			let percentage = (value*100 / sum).toFixed(2)+"%";
				// 			return percentage;
				// 		},
				// 		color: '#fff',
				// 	}
				// }
				plugins: {
					datalabels: {
						display: 'auto',
						color: 'black',
						formatter: (value, ctx) => {
							let sum = 0;
							let dataArr = ctx.chart.data.datasets[0].data;
							dataArr.forEach(data => sum += data);
							let percentage = sum ? (value*100 / sum).toFixed(2)+"%" : "Nothing to display";
							return percentage;
						},
					}
			 	}
      }}
    />
  );
}