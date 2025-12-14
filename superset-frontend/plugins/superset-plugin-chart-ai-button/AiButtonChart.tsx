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
import React, { useState } from 'react';
import type { SupersetTheme } from '@apache-superset/core';
import styled from '@emotion/styled';
import { AiButtonChartProps, AiButtonStylesProps } from './types';

const Styles = styled.div<AiButtonStylesProps>`
  padding: ${({ theme }: { theme: SupersetTheme }) => theme.sizeUnit * 4}px;
  border-radius: ${({ theme }: { theme: SupersetTheme }) =>
    theme.sizeUnit * 2}px;
  height: ${({ height }: { height: number }) => height}px;
  width: ${({ width }: { width: number }) => width}px;
  overflow-y: auto;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;

  h3 {
    color: #667eea;
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .input-container {
    width: 100%;
    max-width: 500px;
    display: flex;
    gap: 8px;
    flex-direction: column;
  }

  input {
    width: 100%;
    padding: 12px 16px;
    font-size: 15px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    outline: none;
    transition: all 0.3s ease;
    background: white;

    &:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    &::placeholder {
      color: #999;
    }
  }

  button {
    padding: 12px 24px;
    font-size: 16px;
    font-weight: bold;
    color: white;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    pointer-events: auto !important;
    z-index: 999;
    position: relative;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
  }

  .hint {
    font-size: 13px;
    color: #666;
    text-align: center;
    margin-top: 4px;
  }

  .status {
    font-size: 12px;
    color: #28a745;
    text-align: center;
    min-height: 20px;
  }
`;

export default function AiButtonChart(props: AiButtonChartProps) {
  const { height, width } = props;
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      setStatus('请输入问题');
      setTimeout(() => setStatus(''), 2000);
      return;
    }

    // 发送消息到父窗口
    try {
      // 方式1: 发送给直接父窗口
      window.parent.postMessage(
        {
          type: 'ai-question',
          payload: question.trim(),
        },
        '*',
      );

      // 方式2: 发送给顶层窗口
      if (window.top && window.top !== window) {
        window.top.postMessage(
          {
            type: 'ai-question',
            payload: question.trim(),
          },
          '*',
        );
      }

      // 显示成功状态
      setStatus('✓ 问题已发送');
      setQuestion('');

      // 清除状态
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('✗ 发送失败');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <Styles height={height} width={width}>
      <h3>🤖 AI 助手</h3>

      <form onSubmit={handleSubmit} className="input-container">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="输入您的问题..."
          autoFocus
        />
        <button type="submit" disabled={!question.trim()}>
          发送问题
        </button>
        <div className="hint">按 Enter 键快速发送</div>
      </form>

      {status && <div className="status">{status}</div>}
    </Styles>
  );
}
