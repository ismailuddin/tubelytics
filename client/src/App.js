import React, { Component } from 'react';
import WorkDays from './components/WorkDays';
import WorkCommutes from './components/WorkCommutes';
import AutocompleteTextbox from './components/AutocompleteTextbox';
import axios from 'axios';
import stations from './stations';

class App extends Component {
	state = {
		workdays: [],
		workCommutes: [],
		processed: false,
		fileStatus: "Choose a file",
		workStation: "",
		homeStation: "",
		earliestWorkDay: "",
		latestWorkDay: "",
		latestEndTime: "",
		earliestStartTime: ""
	};

	componentDidMount() {
	}

	onSubmit = (e) => {
		e.preventDefault();
		const files = e.target["files[]"].files;
		const formData = new FormData();
		for (const file of files) {
			formData.append("files[]", file);
		}
		formData.append("home_station", this.state.homeStation);
		formData.append("work_station", this.state.workStation);
		axios.post(
			"/api/upload",
			formData,
			{
				"headers": {
					"Content-Type": "multipart/form-data"
				}
			}
		).then(response => {
			this.setState({
				workdays: response.data.workdays,
				workCommutes: response.data.work_commutes,
				earliestWorkDay: response.data.earliest_work_day,
				latestWorkDay: response.data.latest_work_day,
				earliestStartTime: response.data.earliest_start_time,
				latestEndTime: response.data.latest_end_time,
				fileStatus: "✅ Processed successfully!",
				processed: true
			});
		}).catch(err => {
			if (err.response) {
				alert(err.response.data);
			}
		})
	}

	handleFileChange = (e) => {
		const filelist = e.target.files;
		if (filelist.length > 1) {
			this.setState({
				fileStatus: `${filelist.length} files added`
			})
		} else if (filelist.length === 1) {
			this.setState({
				fileStatus: `${filelist.length} file added`
			})
		} else if (filelist.length === 0) {
			this.setState({
				fileStatus: "Please add files"
			})
		}
	}

	setWorkStation = (value) => {
		this.setState({
			workStation: value
		})
	}

	setHomeStation = (value) => {
		this.setState({
			homeStation: value
		})
	}

	renderInsights() {
		if (this.state.processed) {
			return (
				<div className="row">
					<div className="card">
						<div className="card-title">Insights</div>
						<div className="row">
							<div className="insight" id="earliest-workday">
								You tend to start work earliest on a
								<span className="variable">
									{this.state.earliestWorkDay}
								</span>
							</div>
							<div className="insight" id="earliest-workday">
								You tend to start work latest on a
								<span className="variable">
									{this.state.latestWorkDay}
								</span>
							</div>
							<div className="insight" id="earliest-workday">
								The earliest you've started work was at
								<span className="variable">
									{this.state.earliestStartTime}
								</span>
							</div>
							<div className="insight" id="earliest-workday">
								The latest you've left work was at
								<span className="variable">
									{this.state.latestEndTime}
								</span>
							</div>
						</div>
						<div className="row">
							 
						</div>
					</div>
				</div>
			)
		}
	}

	render() {
		return (
			<div className="App">
				<h1> <span role="img" aria-label="metro">🚇</span> Tube and <span role="img" aria-label="box">🗃</span> work day analytics</h1>
				<p className="body">
					Analyse your work days using your London Underground Oyster card journey history. 
					By registering your Oyster card on <a href="https://www.tfl.gov.uk/">tfl.gov.uk</a>, you can get
					a weekly statement in a .CSV file of your journeys. Upload these files below to
					gain some insight into your journeys and work day.
				</p>
				<div className="row">
					<div className="card">
						<div className="card-title">Upload journey history</div>
						<p>
							Upload the .CSV files of your journey history from <a href="https://www.tfl.gov.uk/">tfl.gov.uk</a>. 
							<b> No data</b> is stored on the server, all data is processed and returned directly back to the web browser.
						</p>
						<form onSubmit={this.onSubmit}>
							<div className="row">
								<AutocompleteTextbox
									entries={stations}
									label="🏡Home station"
									updateParent={this.setHomeStation}
									/>
								<AutocompleteTextbox
									entries={stations}
									label="🏙 Work station"
									updateParent={this.setWorkStation}
								/>
							</div>
							<input
								type="file"
								name="files[]"
								id="files[]"
								multiple={true}
								onChange={this.handleFileChange}
								required
							/>
							<label id="fileUploadBox" className="file-upload" htmlFor="files[]">{this.state.fileStatus}</label>
							<input type="submit" value="Submit" className="btn"/>
						</form>
					</div>
				</div>
				<div className="row">
					<div className="card">
						<div className="card-title">Work commute journeys</div>
						<p>
							The average journey time for your work commute broken
							down by day of week, averaged over all journeys provided. 
						</p>
						<WorkCommutes data={this.state.workCommutes} />
					</div>
					<div className="card" style={{ 'flexShrink': 2}}>
						<div className="card-title">Work days</div>
						<p>
							Length of your work days for each week of the year.
							The inner most arc is the first day of the week (Monday)
							and the outer most being Friday. The hour of the day runs along
							the arc from 0 to 24 hours.
						</p>
						<WorkDays data={this.state.workdays} />
					</div>
				</div>
				{ this.renderInsights() }
			</div>
		);
	}
}

export default App;
