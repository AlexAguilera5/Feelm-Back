var express = require('express');
var router = express.Router();
var moviesModel = require('../models/movies');
var userModel = require('../models/user');
var cloudinary = require('cloudinary').v2;
var passport = require('passport');
cloudinary.config({
  cloud_name: 'dqmzk3rbf',
  api_key: '722637443465419',
  api_secret: 'MFnxs2Z0176dOMUl6Vp_EGEpswc'
});

const request = require('request');
const subscriptionKey = 'd63ea5ed12bc449e826843e3d0dff398';
const uriBase = 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect';

router.post('/upload', function (req, res, next) {

  var extention;
  if (req.files.picture.mimetype == "image/jpeg") {
    extention = 'jpg';
  } else if (req.files.picture.mimetype == "image/png") {
    extention = 'png';
  }

  if (extention) {
    req.files.picture.mv('./public/images/' + req.files.picture.name + '.' + extention,

      function (err, result) {
        if (err) {
          res.json({ result: false, message: err });
        } else {
          cloudinary.uploader.upload('./public/images/' + req.files.picture.name + '.' + extention, { quality: 50 }, function (error, result) {
            console.log(result)
            const imageUrl = result.secure_url;
            const params = {
              'returnFaceId': 'true',
              'returnFaceLandmarks': 'false',
              'returnFaceAttributes': 'age,smile,emotion'
            };

            const options = {
              uri: uriBase,
              qs: params,
              body: '{"url": ' + '"' + imageUrl + '"}',
              headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': subscriptionKey
              }
            };
            request.post(options, (error, response, body) => {
              console.log(body)
              if (error) {

                console.log('Error: ', error);
                return;
              }
              let jsonResponse = JSON.parse(body);
              console.log(jsonResponse[0])
              console.log('jsonResponse: ===========', jsonResponse[0].faceAttributes.emotion.happiness);
              console.log('jsonResponse: ===========', jsonResponse[0].faceAttributes.emotion.sadness);
              console.log('jsonResponse: ===========', jsonResponse[0].faceAttributes.emotion.surprise);
              userModel.findOne({
                _id: '5d4310ec6cf29a00174977fb'
              }, function (err, user) {
                user.pictures.push({
                  pictureName: result.original_filename,
                  pictureUrl: result.secure_url,
                  smile: jsonResponse[0].faceAttributes.smile,
                  age: jsonResponse[0].faceAttributes.age,
                  heureux: jsonResponse[0].faceAttributes.emotion.happiness,
                  triste: jsonResponse[0].faceAttributes.emotion.sadness,
                  surpris: jsonResponse[0].faceAttributes.emotion.surprise,
                });
                user.save();
              });
              res.json({ jsonResponse, result });
            });
            console.log(result, error)
            
          });

        }
      }

    );
  }
});

router.get('/userSearch', function (req, res, next) {
  userModel.findOne({
    facebookid: req.query.facebookid
  }, function (err, userExist) {
      console.log(userExist)
      res.json({ result: true, userExist });
  });
})

router.get('/match', function (req, res, next) {

  userModel.find(
    function (err, userMatch) {
      res.json({ result: true, userMatch });
    });
});

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});


/* GET home page. */
router.get('/listMovies', function (req, res, next) {

  moviesModel.find(
    function (err, movie) {
      res.json({ result: true, movie });
    });
});


/* GET facebook auth. */
router.get('/auth/facebook',
  function (req, res, next) {
    passport.authenticate(
      'facebook', { scope: 'email', state: JSON.stringify(req.query) }
    )(req, res, next);
  }
);
/* GET facebook callback. */
router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { session: false }),

  function (req, res) {

    res.redirect(req.user.redirectUrl
      + "?userId=" + req.user.id
      + "&firstName=" + req.user.first_name
      + "&lastName=" + req.user.last_name
      + "&email=" + req.user.email
      + "&picture=" + encodeURIComponent(req.user.picture.data.url));
    userModel.findOne({
      facebookid: req.user.id,
    }, function (err, user) {
      if (!user) {
        var newUser = new userModel({
          firstname: req.user.first_name,
          lastname: req.user.last_name,
          email: req.user.email,
          picture: req.user.picture.data.url,
          facebookid: req.user.id
        });
        newUser.save(
          function (err, user) {
            res.json({ result: true, user });
          });
      }
    });
  });

module.exports = router;
