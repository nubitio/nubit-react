import React from 'react';
import { FeatureGate as UiFeatureGate, type FeatureGateProps as UiFeatureGateProps } from '@nubitio/ui';
import { useFeature } from '../hooks/useFeature';

export type FeatureGateProps = Omit<UiFeatureGateProps, 'enabled'>;

export function FeatureGate({ featureKey, ...props }: FeatureGateProps) {
  const enabled = useFeature(featureKey);
  return <UiFeatureGate featureKey={featureKey} enabled={enabled} {...props} />;
}