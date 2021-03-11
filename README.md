This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Dev Setup Instructions

1. Create `.env` files in the `frontend` and `backend` folder and fill in information specified by corresponding `.env.example` files
2. Create a file called `private.key` and `public.key` with RSA Private and public keys in the `backend` folder. It will be used for the JWT token signing and verification respectively

### Run Locally

1. Start a local instance of mongodb on port `27017`
2. `cd` into `backend` folder, run `npm start`
3. `cd` into `frontend` folder, run `npm start`

### Run with Docker

1. Create a `.env` file at the project root folder and fill with enter values for `MONGO_ROOT_USERNAME` and `MONGO_ROOT_PASSWORD`. This will be used in docker-compose for creation of the mongodb admin user
2. Update mongodb credentials in `mongo-init.js`. This file contains the script to create a user that can read/write to the records database
3. At root folder, run `docker-compose up --build -d`
   Note: This [doesn't work with Windows](https://github.com/docker-library/faq/pull/17/commits/9dc17303b98c8f63cdad5ed873b25b9850a1494b)

## LXC Container Setup and Deployment Instructions

1. Install Node.js using the [NodeSource repo](https://www.geeksforgeeks.org/installation-of-node-js-on-linux/)
2. [Install Git](https://www.atlassian.com/git/tutorials/install-git#linux)
   - Optional: [Setup SSH](https://docs.github.com/en/github/authenticating-to-github/adding-a-new-ssh-key-to-your-github-account)
3. Optional: [Install Docker](https://docs.docker.com/engine/install/ubuntu/)
   - Before installing Docker, configure the lxd container first
4. Install MongoDB (https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)
   - Will need to first install WGET by running `sudo apt-get install wget`
   - To setup database:
     1. Run command `mongod` in container terminal
     2. In separate terminal, run mongo shell with `mongo`
     3. In shell, run `db.createUser({ user: {ADMIN_USERNAME}, pwd: {ADMIN_PWD}, roles: [{ role: "root", db: "admin" }] })`
     4. Terminate mongodb process and exit mongo shell
     5. Start mongodb process again in the background with authentication enabled by running `mongod --auth --fork --logpath /var/log/mongod.log`
     6. In separate terminal, run mongo shell again with `mongo`
     7. In shell, run `use admin` to go to admin db
     8. Run `db.auth({ADMIN_USERNAME}, {ADMIN_PWD})` to authenticate as admin user
     9. Upon successful authentication, run `use records` to create database to store survey data
     10. Run `db.createUser({ user: {RECORDS_USERNAME}, pwd: {RECORDS_PWD}, roles: [{ role: "readWrite", db: "records" }] })` to create a separate user to read and write to the records db
5. Install the Nodejs process manager, PM2, by running ` sudo npm install pm2 -g`, this is needed to [manage/run project in background](https://pm2.keymetrics.io/docs/usage/quick-start/)
6. Clone this repo and follow instructions to setup `.env` files in the `frontend` and `backend` folder
7. Install Python 2 and Pip if they are not yet installed in the container
8. Install the pandas and xlrd library by running `pip install pandas` and `pip install xlrd`. The two python libraries are required when executing the python script for parsing FNH and MCML fob data report.
9. Go into the `frontend` folder in repo and create a production build of the front-end by running `npm run prod`
10. Go into the `backend` folder and run `pm2 --name Covid-dashboard start npm – start` to start the project in the background
11. Tada! The app can now be accessed in the specified port in `.env`
