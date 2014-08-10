var express      = require('express');
var path         = require('path');
var favicon      = require('static-favicon');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var mongoose     = require('mongoose');
var bcrypt       = require('bcryptjs');
var async        = require('async');
var request      = require('request');
var xml2js       = require('xml2js');
var _            = require('lodash');

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});

// Mongoose schema
var showSchema = new mongoose.Schema({
	_id           : Number,
	name          : String,
	airsDaysOfWeek: String,
	airsTime      : String,
	firstAired    : Date,
	genre         : [String],
	network       : String,
	overview      : String,
	rating        : Number,
	ratingCount   : Number,
	status        : String,
	poster        : String,
	subscribers   : [{
		type: mongoose.Schema.Types.ObjectId,
		ref : 'User'
	}],
	episodes: [{
		season       : Number,
		episodeNumber: Number,
		episodeName  : String,
		firstAired   : Date,
		overview     : String
	}]
});
var userSchema = new mongoose.Schema({
	email: {
		type  : String,
		unique: true
	},
	password: String
});

// Defining the mongoose models using the schema
var User = mongoose.model('User', userSchema);
var Show = mongoose.model('Show', showSchema);

// Initialise the mongo db with mongoose. Simple!
mongoose.connect('localhost');

// A pre-save funtion to perform certain tasks
userSchema.pre('save', function(next) {
	var user = this;
	if(!user.isModified('password'))
		return next();
	bcrypt.genSalt(10, function(err, salt) {
		if(err)
			return next(err);
		bcrypt.hash(user.password, salt, function(err, hash) {
			if(err)
				return next(err);
			user.password = hash;
			next();
		});
	});
});

// A method to compare the password to the one provided
userSchema.methods.comparePassword = function(candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if(err)
			return cb(err);
		cb(null, isMatch);
	});
};

/**
 * The routes to be used in the app as defined on the server side
 */

// Route to get the shows based on whatever query is used
app.get('/api/shows', function(req, res, next) {
	var query = Show.find();
	if(req.query.genre) {
		query.where({ genre: req.query.genre });
	}
	else if(req.query.alphabet) {
		query.where({ name: new RegExp('^' + '[' + req.query.alphabet + ']', 'i')});
	}
	else {
		query.limit(12);
	}
	query.exec(function(err, shows) {
		if(err)
			return next(err);
		res.send(shows);
	});
});

// Route to get a single show
app.get('/api/shows/:id', function(req, res, next) {
	Show.findById(req.params.id, function(err, show) {
		if(err)
			return next(err);
		res.send(show);
	});
});

app.get('*', function(req, res) {
	res.redirect('/#' + req.originalUrl);
});

// Send error message to client
app.use(function(err, req, res, next) {
	console.error(err.stack);
	res.send(500, { message: err.message });
});

// The post function to get the show details from theTVDB
app.post('/api/shows', function(req, res, next) {
	// you need to get this apikey from theTVDB by creating an account
	var apiKey = 'F917081C46B60FCD';
	// The xml parser
	var parser = xml2js.Parser({
		explicitArray: false,
		normalizeTags: true
	});

	// this converts the seriesname searched from client to conform with api standard
	// i.e. convert spaces to underscore and remove other characters
	var seriesName = req.body.showName
		.toLowerCase()
		.replace(/ /g, '_')
		.replace(/[^\w-]+/g, '');

	// This is used to initiate each function in it's array one after another (hence 'waterfall')
	async.waterfall([

		// This first function which searches for series with the search terms and assigns to seriesId variable
		function(callback) {
			request.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + seriesName, function(error, response, body) {
				if(error)
					return next(error);
				parser.parseString(body, function(err, result) {
					if(!result.data.series) {
						return res.send(404, { message: req.body.showName + ' was not found' });
					}
					var seriesId = result.data.series.seriesid || result.data.series[0].seriesid;
					// this calls the next function in the waterfall. if there is any error, the waterfall is stopped
					callback(err, seriesId);
				});
			});
		},
		// takes the seriesId from the last function and gets series data
		function(seriesId, callback) {
			request.get('http://thetvdb.com/api/' + apiKey + '/series/' + seriesId + '/all/en.xml', function(error, response, body) {
				if(error)
					return next(error);
				// parses the xml returned to create json data of the show
				parser.parseString(body, function(err, result) {
					var series   = result.data.series;
					var episodes = result.data.episode;
					var show     = new Show({
						_id          : series.id,
						name         : series.seriesname,
						airsDayOfWeek: series.airs_dayofweek,
						airsTime     : series.airs_time,
						firstAired   : series.firstaired,
						genre        : series.genre.split('|').filter(Boolean),
						network      : series.network,
						overview     : series.overview,
						rating       : series.rating,
						ratingCount  : series.ratingcount,
						runtime      : series.runtime,
						status       : series.status,
						poster       : series.poster,
						episodes     : []
					});
					// '_' replaces the for loop completely. the first argument in an _ function should be the array and then
					// a function to perform the required ... function. AWESOME! supported by the lodash library
					_.each(episodes, function(episode) {
						show.episodes.push({
							season       : episode.seasonnumber,
							episodeNumber: episode.episodenumber,
							episodeName  : episode.episodename,
							firstAired   : episode.firstaired,
							overview     : episode.overview
						});
					});
					// send the showdata generated to the next waterfall function
					callback(err,show);
				});
			});
		},
		// gets the banner for the show and sends
		function(show, callback) {
			var url = 'http://thetvdb.com/banners/' + show.poster;
			request({ url: url, encoding: null }, function(error, response, body) {
				show.poster = 'data:' + response.headers['content-type'] + ';base64,' + body.toString('base64');
				callback(error, show);
			});
		}
	], function(err, show) {
		// this function handles the errors coming out of the waterfall
		if(err)
			return next(err);
		show.save(function(err) {
			if(err) {
				if(err.code == 11000) {
					return res.send(409, { message: show.name + ' already exists' });
				}
				return next(err);
			}
			res.send(200);
		});
	});
});
