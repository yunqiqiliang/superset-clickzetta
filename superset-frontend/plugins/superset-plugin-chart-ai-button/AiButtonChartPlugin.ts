/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { ChartPlugin, Behavior, ChartMetadata } from '@superset-ui/core';
import thumbnail from './thumbnail.png';
import { AiButtonChartProps } from './types';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';

export default class AiButtonChartPlugin extends ChartPlugin<
  AiButtonChartProps,
  any
> {
  constructor() {
    const metadata = new ChartMetadata({
      name: 'AI Button Chart',
      description: 'A chart with a button to trigger AI actions.',
      credits: ['your-name'],
      tags: ['Experimental'],
      thumbnail,
      behaviors: [Behavior.InteractiveChart],
      canBeAnnotationTypes: [],
      supportedAnnotationTypes: [],
      useLegacyApi: false,
      datasourceCount: 0,
      enableNoResults: true,
      exampleGallery: [],
    });
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('./AiButtonChart'),
      metadata,
      transformProps: (x: any) => x,
    });
  }
}
