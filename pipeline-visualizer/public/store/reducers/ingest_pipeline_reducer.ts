import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { OsIngestPipeline, PipelineSummary } from '../../../common';
import { routeService } from '../../route_service';

interface IngestState {
  summaries: PipelineSummary[];
  pipelines: Record<string, OsIngestPipeline>;
  loading: boolean;
  error: string | null;
}
const initialState: IngestState = { summaries: [], pipelines: {}, loading: false, error: null };

export const fetchIngestPipelines = createAsyncThunk('ingest/fetchAll', async (_, { rejectWithValue }) => {
  try { return await routeService.listIngestPipelines(); }
  catch (err: any) { return rejectWithValue(err.body?.message ?? err.message ?? 'Failed'); }
});
export const fetchIngestPipeline = createAsyncThunk('ingest/fetchOne', async (id: string, { rejectWithValue }) => {
  try { return { id, pipeline: await routeService.getIngestPipeline(id) }; }
  catch (err: any) { return rejectWithValue(err.body?.message ?? err.message ?? 'Failed'); }
});
export const saveIngestPipeline = createAsyncThunk('ingest/save', async ({ id, body }: { id: string; body: OsIngestPipeline }, { rejectWithValue }) => {
  try { await routeService.saveIngestPipeline(id, body); return { id, body }; }
  catch (err: any) { return rejectWithValue(err.body?.message ?? err.message ?? 'Failed'); }
});
export const deleteIngestPipeline = createAsyncThunk('ingest/delete', async (id: string, { rejectWithValue }) => {
  try { await routeService.deleteIngestPipeline(id); return id; }
  catch (err: any) { return rejectWithValue(err.body?.message ?? err.message ?? 'Failed'); }
});

const slice = createSlice({
  name: 'ingestPipeline', initialState, reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchIngestPipelines.pending, s => { s.loading = true; s.error = null; });
    b.addCase(fetchIngestPipelines.fulfilled, (s, a) => { s.loading = false; s.summaries = a.payload; });
    b.addCase(fetchIngestPipelines.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; });
    b.addCase(fetchIngestPipeline.pending, s => { s.loading = true; s.error = null; });
    b.addCase(fetchIngestPipeline.fulfilled, (s, a) => { s.loading = false; s.pipelines[a.payload.id] = a.payload.pipeline; });
    b.addCase(fetchIngestPipeline.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; });
    b.addCase(saveIngestPipeline.fulfilled, (s, a) => { s.pipelines[a.payload.id] = a.payload.body; });
    b.addCase(deleteIngestPipeline.fulfilled, (s, a) => {
      delete s.pipelines[a.payload];
      s.summaries = s.summaries.filter(x => x.id !== a.payload);
    });
  },
});
export default slice.reducer;
