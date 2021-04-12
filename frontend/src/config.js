const dev = {
  api: {
    COVID: "http://localhost:8080/api/covid",
    FOB_DATA_QUERY: "http://localhost:8080/api/fob/query",
    FOB_DATA_UPDATE: "http://localhost:8080/api/fob/update",
    LOGIN: "http://localhost:8080/api/login"
  }
};

const prod = {
  api: {
    COVID: "/api/covid",
    FOB_DATA_QUERY: "/api/fob/query",
    FOB_DATA_UPDATE: "/api/fob/update",
    LOGIN: "/api/login"
  }
};

const config = process.env.REACT_APP_STAGE === 'production'
  ? prod
  : dev;

export default config