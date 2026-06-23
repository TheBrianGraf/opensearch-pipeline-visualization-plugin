import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { MlModel } from '../../../common';
import { routeService } from '../../route_service';

interface MlState {
  models: MlModel[];
  loading: boolean;
  error: string | null;
}
const initialState: MlState = { models: [], loading: false, error: null };

export const fetchMlModels = createAsyncThunk('ml/fetchModels', async (_, { rejectWithValue }) => {
  try { return await routeService.listMlModels(); }
  catch (err: any) { return rejectWithValue(err.body?.message ?? err.message ?? 'Failed'); }
});

const slice = createSlice({
  name: 'mlModel',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMlModels.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchMlModels.fulfilled, (s, a) => { s.loading = false; s.models = a.payload; });
    b.addCase(fetchMlModels.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; });
  },
});
export default slice.reducer;
