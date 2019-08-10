import React, { Component } from 'react';
import { Bar } from 'react-chartjs-2';
import _ from 'lodash';

export default class WorkCommutes extends Component {
    state = {
        minValue: 0
    }

    colours = [
        {
            borderColor: 'rgba(230, 108, 92, 1)',
            backgroundColor: 'rgba(230, 108, 92, 1)',
        },
        {
            borderColor: 'rgba(76, 2, 161, 1)',
            backgroundColor: 'rgba(76, 2, 161, 1)',
        }
    ]

    componentDidUpdate(prevProps, prevState){
        if (this.props.data !== prevProps.data){
            const minValue = _.minBy(this.props.data, d => { return d.jt_minutes});
            this.setState({
                minValue: minValue.jt_minutes - 5
            });
        }
    }

    processData(data) {
        const chartData = {
            labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            datasets: []
        }
        const directions = ["to_work", "from_work"];
        
        for (let i = 0; i < directions.length; i++) {
            const direction = directions[i];
            const days = data.filter(d => { return d.direction == direction });
            let _data = [];
            days.forEach(day => {
                _data.push(day.jt_minutes);
            });
            chartData.datasets.push({
                label: direction,
                data: _data,
                borderWidth: 1,
                ...this.colours[i]    
            });
            
        }
        return chartData;
    }

    render() {
        return (
            <div className="chart">
                <Bar
                    data={this.processData(this.props.data)}
                    options={{
                        scales: {
                            yAxes: [{
                                ticks: {
                                    min: this.state.minValue
                                },
                                scaleLabel: {
                                    display: true,
                                    labelString: "Average commute length (minutes)"
                                }
                            }]
                        }
                    }}
                />
            </div>
        )
    }
}