import React from 'react';
import {Text} from 'react-native';
import renderer, {act, ReactTestRendererJSON} from 'react-test-renderer';

import {StatCard} from '@/components/StatCard';

describe('StatCard', () => {
  it('supports compact rendering with constrained text and custom container width', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <StatCard
          label="Histórico"
          value="3"
          helper="Execuções totais"
          compact
          containerStyle={{width: '48%'}}
        />,
      );
    });

    const card = tree!.toJSON() as ReactTestRendererJSON | null;

    expect(card).not.toBeNull();
    expect(card?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({width: '48%'})]),
    );

    const texts = tree!.root.findAllByType(Text);
    const textProps = texts.map(node => node.props.numberOfLines);

    expect(textProps).toEqual([1, 1, 1]);
  });
});
