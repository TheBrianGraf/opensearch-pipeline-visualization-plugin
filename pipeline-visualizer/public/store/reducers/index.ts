import { combineReducers } from '@reduxjs/toolkit';
import ingestPipelineReducer from './ingest_pipeline_reducer';
import searchPipelineReducer from './search_pipeline_reducer';
import indexAssocReducer from './index_assoc_reducer';
import mlModelReducer from './ml_model_reducer';
import indexSettingsReducer from './index_settings_reducer';

export const rootReducer = combineReducers({
  ingestPipeline: ingestPipelineReducer,
  searchPipeline: searchPipelineReducer,
  indexAssoc: indexAssocReducer,
  mlModel: mlModelReducer,
  indexSettings: indexSettingsReducer,
});
