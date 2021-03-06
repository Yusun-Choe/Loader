import {createConnection} from "typeorm";
import Bull from 'bull';
import property from "../property.json"
import ormConfig from "./config/ormConfig";
import DataLoaderController from './DataLoaderController';
import MetaLoaderController from './MetaLoaderController';

export class Loader {
  dataLoaderQueue:Bull.Queue;
  metaLoaderQueue: Bull.Queue;
  
  constructor() {}

  setupDbAndServer = async () => {
      const defaultConnection = {
        ...ormConfig.defaultConnection
      }
      const datasetConnection = {
        ...ormConfig.datasetConnection
      }
      let redisHost = property["jobqueue-redis"].host
      if(process.env.NODE_ENV !== 'production') {
        redisHost = "localhost"
        defaultConnection.database ="designer-test"
      }
      await createConnection(defaultConnection).catch(error => console.log(error));
      await createConnection(datasetConnection).catch(error => console.log(error));
      console.log("Server starts");
      
      this.dataLoaderQueue = new Bull('dataLoader', {
        redis: {
          port: property["jobqueue-redis"].port,
          host: redisHost
        }
      });

      this.metaLoaderQueue = new Bull('metaLoader', {
        redis: {
          port: property["jobqueue-redis"].port,
          host: redisHost
        }
      })

      this.dataLoaderQueue.process((job, done) => DataLoaderController.loadData(job, done))
      this.dataLoaderQueue.on("failed", (job, err) => DataLoaderController.handleFailed(job, err));
      this.dataLoaderQueue.on("completed", (job) => DataLoaderController.handleCompleted(job));

      this.metaLoaderQueue.process((job, done) => MetaLoaderController.loadMeta(job, done));
  }
}