const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt-nodejs');
const knex = require('knex')

const app = express();

app.use(express.json());
app.use(cors());

// database connection using library knex
const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : '01182718',
    database : 'smartbrain'
  }
});

//root directory
app.get('/', (req,res)=>{
	res.status(200).json('success')
})


//signin
app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  if(!email || !password){
  	return res.status(400).json('incorrect form submission');
  }
  db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=',email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

//register
app.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  if(!email || !name || !password){
  	return res.status(400).json('incorrect form submission');
  }
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date()
          })
          .then(user => {
            res.json(user[0]);
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'))
})


//profile
app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(400).json('Not found')
      }
    })
    .catch(err => res.status(400).json('error getting user'))
})

const Clarifai = require('clarifai');

const App = new Clarifai.App({
 apiKey: '74c3a44e83884e7e991d6156fa358d76'
});



//imageurl
app.post('/imageurl', (req, res) =>{
	App.models
   .predict(Clarifai.FACE_DETECT_MODEL,req.body.input)
   .then(data => {
   	 res.json(data);
   })
   .catch(err => res.status(400).json('unable to work with api'))
})


//image
app.put('/image', (req, res) =>{
	const {id} = req.body;
	db('users').where('id', '=', id)
	.increment('entries', 1)
	.returning('entries')
	.then(entries => {
		res.json(entries[0]);
	})
	.catch(err => res.status(400).json('unable to get entries'))
    
})


//port 
app.listen(3001, ()=>{
	console.log('app is running ');
})




