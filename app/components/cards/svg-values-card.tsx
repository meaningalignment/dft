// @ts-nocheck
// because the 'tw' props for satori are unrecognized by typescript

import { Fragment } from 'react';
import type { ValuesCard } from '@prisma/client';
import { isAllUppercase } from '~/utils';

export function SVGValuesCard({ card, scalefactor }: { card: ValuesCard, scalefactor?: number }) {
  return <div
    style={{ transform: `scale(${scalefactor || 1}, ${scalefactor || 1})` }}
    tw={
      `border-2 rounded-xl px-8 pt-8 pb-6 m-4 max-w-sm max-h-full bg-white flex flex-col`
    }
  >
    <div style={{ color: "black" }} tw="text-2xl font-bold mb-2">{card.title}</div>
    <div tw="text-md font-normal text-neutral-700 max-h-32">{card.instructionsShort}</div>
    <div tw="text-sm pt-1 font-bold text-black mt-6 mb-1">WHERE MY ATTENTION GOES</div>
    <div tw="flex flex-col">
      {card.evaluationCriteria.map((criterion, id) => (
        <li key={id} tw="text-sm text-neutral-700 flex flex-wrap mb-1">
          {criterion.split(" ").map((word, index) => (
            <Fragment key={index}>
              {index === 0 || isAllUppercase(word) ? (
                <strong tw="font-bold text-neutral-600">
                  {word}
                </strong>
              ) : (
                <>{word}</>
              )}
              <span>&nbsp;</span>
            </Fragment>
          ))}
        </li>
      ))}
    </div>
  </div>
}
