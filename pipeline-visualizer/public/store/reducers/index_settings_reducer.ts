import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { IndexPipelineSettings } from '../../../common';
import { routeService } from '../../route_service';

interface IndexSettingsState {
  indices: IndexPipelineSettings[];
  loading: boolean;
  error: string | null;
}
const initialState: IndexSettingsState = { indices: [], loading: false, error: null };

export const fetchIndexSettings = createAsyncThunk('indexSettings/fetch', async (_, { rejectWithValue }) => {
  try { return await routeService.listIndicesWithPipelineSettings(); }
  catch (err: any) { return rejectWithValue(err.body?.message ?? err.message ?? 'Failed'); }
});

const slice = createSlice({
  name: 'indexSettings',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchIndexSettings.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchIndexSettings.fulfilled, (s, a) => { s.loading = false; s.indices = a.payload; });
    b.addCase(fetchIndexSettings.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; });
  },
});
export default slice.reducer;
