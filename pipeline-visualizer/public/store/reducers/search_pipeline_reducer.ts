import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { OsSearchPipeline, PipelineSummary } from '../../../common';
import { routeService } from '../../route_service';

interface SearchState {
  summaries: PipelineSummary[];
  pipelines: Record<string, OsSearchPipeline>;
  loading: boolean;
  error: string | null;
}
const initialState: SearchState = { summaries: [], pipelines: {}, loading: false, error: null };

export const fetchSearchPipelines = createAsyncThunk('search/fetchAll', async (_, { rejectWithValue }) => {
  try { return await routeService.listSearchPipelines(); }
  catch (err: any) { return rejectWithValue(err.body?.message ?? err.message ?? 'Failed'); }
});
export const fetchSearchPipeline = createAsyncThunk('search/fetchOne', async (id: string, { rejectWithValue }) => {
  try { return { id, pipeline: await routeService.getSearchPipeline(id) }; }
  catch (err: any) { return rejectWithValue(err.body?.message ?? err.message ?? 'Failed'); }
});
export const saveSearchPipeline = createAsyncThunk('search/save', async ({ id, body }: { id: string; body: OsSearchPipeline }, { rejectWithValue }) => {
  try { await routeService.saveSearchPipeline(id, body); return { id, body }; }
  catch (err: any) { return rejectWithValue(err.body?.message ?? err.message ?? 'Failed'); }
});
export const deleteSearchPipeline = createAsyncThunk('search/delete', async (id: string, { rejectWithValue }) => {
  try { await routeService.deleteSearchPipeline(id); return id; }
  catch (err: any) { return rejectWithValue(err.body?.message ?? err.message ?? 'Failed'); }
});

const slice = createSlice({
  name: 'searchPipeline', initialState, reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchSearchPipelines.pending, s => { s.loading = true; s.error = null; });
    b.addCase(fetchSearchPipelines.fulfilled, (s, a) => { s.loading = false; s.summaries = a.payload; });
    b.addCase(fetchSearchPipelines.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; });
    b.addCase(fetchSearchPipeline.pending, s => { s.loading = true; s.error = null; });
    b.addCase(fetchSearchPipeline.fulfilled, (s, a) => { s.loading = false; s.pipelines[a.payload.id] = a.payload.pipeline; });
    b.addCase(fetchSearchPipeline.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; });
    b.addCase(saveSearchPipeline.fulfilled, (s, a) => { s.pipelines[a.payload.id] = a.payload.body; });
    b.addCase(deleteSearchPipeline.fulfilled, (s, a) => {
      delete s.pipelines[a.payload];
      s.summaries = s.summaries.filter(x => x.id !== a.payload);
    });
  },
});
export default slice.reducer;
