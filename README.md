This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Setup Instructions

1. Create `.env` files in the `frontend` and `backend` folder and fill in information specified by corresponding `.env.example` files
2. Create a file called `private.key` with RSA Private key in the `backend` folder. It will serve as the JWT token secret

### Run Locally

1. `cd` into `backend` folder, run `npm start`
2. `cd` into `frontend` folder, run `npm start`

### Run with Docker

1. At root folder, run `docker-compose up --build`


