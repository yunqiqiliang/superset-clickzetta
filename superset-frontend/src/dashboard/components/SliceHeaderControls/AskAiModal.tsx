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
import { styled } from '@apache-superset/core';
import { Modal, Input, Button } from '@superset-ui/core/components';
import { t } from '@superset-ui/core';

const StyledModal = styled(Modal)`
  .ant-modal-body {
    padding: ${({ theme }) => theme.sizeUnit * 6}px;
  }
`;

const InputContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.sizeUnit * 4}px;
`;

const StyledInput = styled(Input.TextArea)`
  && {
    resize: none;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.sizeUnit * 2}px;
`;

const StatusMessage = styled.div<{ type: 'success' | 'error' }>`
  margin-top: ${({ theme }) => theme.sizeUnit * 2}px;
  padding: ${({ theme }) => theme.sizeUnit * 2}px;
  border-radius: 4px;
  color: ${({ type }) => (type === 'success' ? '#52c41a' : '#ff4d4f')};
  background-color: ${({ type }) =>
    type === 'success' ? '#f6ffed' : '#fff2f0'};
  font-size: 14px;
`;

interface AskAiModalProps {
  chartId: number;
  chartName: string;
  dashboardId: number;
  visible: boolean;
  onClose: () => void;
}

export const AskAiModal: React.FC<AskAiModalProps> = ({
  chartId,
  chartName,
  dashboardId,
  visible,
  onClose,
}) => {
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!question.trim()) {
      setStatus({
        type: 'error',
        message: t('Please enter a question'),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 发送消息到父窗口，包含图表上下文
      const message = {
        type: 'ai-question',
        payload: {
          question: question.trim(),
          chartId,
          chartName,
          dashboardId,
          timestamp: new Date().toISOString(),
        },
      };

      // 发送给直接父窗口
      window.parent.postMessage(message, '*');

      // 如果有顶层窗口，也发送给它
      if (window.top && window.top !== window) {
        window.top.postMessage(message, '*');
      }

      setStatus({
        type: 'success',
        message: t('Question sent successfully'),
      });

      // 清空输入并在1.5秒后关闭
      setQuestion('');
      setTimeout(() => {
        onClose();
        setStatus(null);
      }, 1500);
    } catch (error) {
      setStatus({
        type: 'error',
        message: t('Failed to send question'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setQuestion('');
    setStatus(null);
    onClose();
  };

  return (
    <StyledModal
      title={t('Ask AI about "%s"', chartName)}
      show={visible}
      onHide={handleCancel}
      footer={<></>}
      width={600}
      responsive
    >
      <InputContainer>
        <StyledInput
          placeholder={t('Enter your question about this chart...')}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onPressEnter={e => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={4}
          autoFocus
          disabled={isSubmitting}
        />
      </InputContainer>

      {status && (
        <StatusMessage type={status.type}>{status.message}</StatusMessage>
      )}

      <ButtonContainer>
        <Button onClick={handleCancel} disabled={isSubmitting}>
          {t('Cancel')}
        </Button>
        <Button
          buttonStyle="primary"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!question.trim() || isSubmitting}
        >
          {t('Send Question')}
        </Button>
      </ButtonContainer>
    </StyledModal>
  );
};
