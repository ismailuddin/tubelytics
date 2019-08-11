import React, { Component } from 'react';
import WorkDays from './components/WorkDays';
import WorkCommutes from './components/WorkCommutes';
import axios from 'axios';

class App extends Component {
	state = {
		workdays: [],
		workCommutes: [],
		fileStatus: "Choose a file"
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
				fileStatus: "✅ Processed successfully!"
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
			</div>
		);
	}
}

export default App;
