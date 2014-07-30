var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

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
	episodes      : [{
		season       : Number,
		episodeNumber: Number,
		episodeName  : String,
		firstAired   : Date,
		overview     : String
	}]
});
var userSchema = new mongoose.Schema({
	email   : {
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

app.post('/api/shows', function(req, res, next) {
	var apiKey = 'F917081C46B60FCD';
	var parser = xml2js.parser({
		explicitArray: false,
		normalizeTags: true
	});
});