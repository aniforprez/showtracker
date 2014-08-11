// Dependency block
var express       = require('express');
var path          = require('path');
var favicon       = require('static-favicon');
var logger        = require('morgan');
var cookieParser  = require('cookie-parser');
var bodyParser    = require('body-parser');
var mongoose      = require('mongoose');
var bcrypt        = require('bcryptjs');
var async         = require('async');
var request       = require('request');
var xml2js        = require('xml2js');
var _             = require('lodash');
var session       = require('express-session');
var passport      = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var agenda        = require('agenda')({ db: { address: 'localhost:27017/test' } });
var sugar         = require('sugar');
var nodemailer    = require('nodemailer');
var compress      = require('compression');

// Ooooooooh yeaaaaaaaaaaaah
var app = express();

// Middleware stuff
app.set('port', process.env.PORT || 3000);
app.use(compress());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
// The session code MUST be after cookie or it won't work
// since sessions depend on cookies
app.use(session({
	secret: 'keyboard cat',
	saveUninitialized: true,
	resave: true
}));
app.use(passport.initialize());
app.use(passport.session());

var oneWeek = 7 * 24 * 60 * 60 * 1000;
app.use(express.static(path.join(__dirname, 'public'), { maxAge: oneWeek }));
app.use(function(req, res, next) {
	if(req.user) {
		res.cookie('user', JSON.stringify(req.user));
	}
	next();
});

// It's alive!!!!
app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});

/*
This next block is for all the database stuff using mongoose
 */

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

// A method to compare the password to the one provided
userSchema.methods.comparePassword = function(candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if(err)
			return cb(err);
		cb(null, isMatch);
	});
};

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

// The route to get the show details from theTVDB
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
		// this function runs at the end of the waterfall with show as the result
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

			// This creates the agenda job which runs every week 2 hours before the airtime
			// This I feel is HIGHLY inefficient since it runs even if the show is cancelled
			// @TODO find a better way than THIS for alerting the user
			//
			// The awesome Date.create function is provided by sugar.js
			// OK I kinda made a hack by checking the status but it's still not to my liking
			// since it won't check later
			if(show.status === 'Continuing') {
				var alertDate = Date.create('Next ' + show.airsDayOfWeek + ' at ' + show.airsTime).rewind({ hour: 2 });
				agenda.schedule(alertDate, 'send email alert', show.name).repeatEvery('1 week');
			}
		});
	});
});

// The route to tell client user is VALID
// Kinda unsafe since we're sending pw data across the net
// @TODO find a better login solution
app.post('/api/login', passport.authenticate('local'), function(req, res) {
	res.cookie('user', JSON.stringify(req.user));
	res.send(req.user);
});

// The route to SIGN UP the user with data from the client
app.post('/api/signup', function(req, res, next) {
	var user = new User({
		email   : req.body.email,
		password: req.body.password
	});
	console.log(user.password);
	user.save(function(err) {
		if(err)
			return next(err);
		res.send(200);
	});
});

// The route to tell the client is LOGGED OUT
app.get('/api/logout', function(req, res, next) {
	req.logout();
	res.send(200);
});

// The route to subscribe to a show
app.post('/api/subscribe', ensureAuthenticated, function(req, res, next) {
	Show.findById(req.body.showId, function(err, show) {
		if(err)
			return next(err);
		show.subscribers.push(req.user.id);
		show.save(function(err) {
			if(err)
				return next(err);
			res.send(200);
		});
	});
});

// The route to unsubscribe to a show
app.post('/api/unsubscribe', ensureAuthenticated, function(req, res, next) {
	Show.findById(req.body.showId, function(err, show) {
		if(err)
			return next(err);
		var index = show.subscribers.indexOf(req.user.id);
		show.subscribers.splice(index, 1);
		show.save(function(err) {
			if(err)
				return next(err);
			res.send(200);
		});
	});
});

/*
This next block is for authorisation using passport
 */

// serialise and deserialise functions keep the user signed in
passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

// Instead of using FB or Google sign-in, local username and pw strategy is used
// and this function checks the given un and pw and signs in
passport.use(new LocalStrategy({ usernameField: 'email' }, function(email, password, done) {
	User.findOne({ email: email }, function(err, user) {
		if(err)
			return done(err);
		if(!user)
			return done(null, false);
		user.comparePassword(password, function(err, isMatch) {
			if(err)
				return done(err);
			if(isMatch)
				return done(null, user);
			return done(null, false);
		});
	});
}));

function ensureAuthenticated(req, res, next) {
	if(req.isAuthenticated())
		next();
	else
		res.send(401);
}

/*
The agenda task which sends a mail to the user alerting them to the next episode of the subscribed shows
 */
agenda.define('send email alert', function(job, done) {
	Show.findOne({ name: job.attrs.data })
		// populate is a mongoose function to get all data matching the attribute passed
		// here we get the subscribers array which is then passed to the exec function to do whatevs
		.populate('subscribers')
		.exec(function(err, show) {
			if(err)
				return next(err);
			var emails = show.subscribers.map(function(user) {
				return user.email;
			});

			var upcomingEpisode = show.episodes.filter(function(episode) {
				var lastEp = new Date(episode.firstAired);
				return new Date(episode.firstAired) > new Date();
			})[0];

			// checking if another episode even exists. this is hacky as fuck but for now it'll do
			// it comes out of the function if it doesn't
			if(!upcomingEpisode) {
				return;
			}

			var smtpTransport = nodemailer.createTransport('SMTP', {
				service: 'SendGrid',
				auth: { user: 'hslogin', pass: 'hspassword00' }
			});

			var mailOptions = {
				from: 'Showtracker <showtracker@something.com>',
				to: emails.join(','),
				subject: show.name + ' will start soon',
				text: show.name + ' starts in less than 2 hours on ' + show.network +
					'.\n\n' + 'Episode ' + upcomingEpisode.episodeNumber + ' Overview\n\n' +
					upcomingEpisode.overview
			};

			smtpTransport.sendMail(mailOptions, function(error, response) {
				smtpTransport.close();
				done();
			});
		});
});

// Start the mailing job
agenda.start();

// what to do when the job starts
agenda.on('start', function(job) {
	console.log("Agenda job has started");
});

// what to do when the job is done
agenda.on('complete', function(job) {
	console.log("Agendajob is done");
});