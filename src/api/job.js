/*
 * Copyright 2024-2026 jffast
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createCrud, http } from '@/api/core/crud';

const job = createCrud('/sys/job', {
  pause: (id) => http.put(`/sys/job/pause/${id}`),
  resume: (id) => http.put(`/sys/job/resume/${id}`),
  trigger: (id) => http.put(`/sys/job/trigger/${id}`),
  checkCron: (cronExpression) => http.get('/sys/job/checkCron', { cronExpression }),
  nextExecution: (cronExpression) => http.get('/sys/job/nextExecution', { cronExpression }),
  targets: () => http.get('/sys/job/targets'),
});

const jobLog = createCrud('/sys/job/log', {
  clean: () => http.delete('/sys/job/log/clean'),
});

export { job, jobLog };
