import { useTranslation } from '@pancakeswap/localization'
import { ArrowBackIcon, ArrowForwardIcon, AutoColumn, Box, LinkExternal, SortArrowIcon, Text } from '@pancakeswap/uikit'
import { useActiveChainId } from 'hooks/useActiveChainId'
import useTheme from 'hooks/useTheme'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useGetChainName } from 'state/info/hooks'
import styled from 'styled-components'
import { Arrow, Break, ClickableColumnHeader, PageButtons, TableWrapper } from 'views/Info/components/InfoTables/shared'
import { Transaction, TransactionType } from '../../types'
import { getEtherscanLink, shortenAddress } from '../../utils'
import { formatTime } from '../../utils/date'
import { formatAmount, formatDollarAmount } from '../../utils/numbers'
import HoverInlineText from '../HoverInlineText'
import Loader from '../Loader'
import { RowFixed } from '../Row'
import { SortButton, useSortFieldClassName } from '../SortButton'

const ResponsiveGrid = styled.div`
  display: grid;
  grid-gap: 1em;
  align-items: center;

  grid-template-columns: 1.5fr repeat(5, 1fr);
  padding: 0 24px;
  @media screen and (max-width: 940px) {
    grid-template-columns: 1.5fr repeat(4, 1fr);
    & > *:nth-child(5) {
      display: none;
    }
  }

  @media screen and (max-width: 800px) {
    grid-template-columns: 1.5fr repeat(2, 1fr);
    & > *:nth-child(5) {
      display: none;
    }
    & > *:nth-child(3) {
      display: none;
    }
    & > *:nth-child(4) {
      display: none;
    }
  }

  @media screen and (max-width: 500px) {
    grid-template-columns: 1.5fr repeat(1, 1fr);
    & > *:nth-child(5) {
      display: none;
    }
    & > *:nth-child(3) {
      display: none;
    }
    & > *:nth-child(4) {
      display: none;
    }
    & > *:nth-child(2) {
      display: none;
    }
  }
`

const SortText = styled.button<{ active: boolean }>`
  cursor: pointer;
  font-weight: ${({ active }) => (active ? 500 : 400)};
  margin-right: 0.75rem !important;
  border: none;
  background-color: transparent;
  font-size: 1rem;
  padding: 0px;
  color: ${({ active, theme }) => (active ? theme.colors.text : theme.colors.textSubtle)};
  outline: none;
  @media screen and (max-width: 600px) {
    font-size: 14px;
  }
`

const SORT_FIELD = {
  amountUSD: 'amountUSD',
  timestamp: 'timestamp',
  sender: 'sender',
  amountToken0: 'amountToken0',
  amountToken1: 'amountToken1',
}

const DataRow = ({ transaction }: { transaction: Transaction; color?: string }) => {
  const abs0 = Math.abs(transaction.amountToken0)
  const abs1 = Math.abs(transaction.amountToken1)
  const outputTokenSymbol = transaction.amountToken0 < 0 ? transaction.token0Symbol : transaction.token1Symbol
  const inputTokenSymbol = transaction.amountToken1 < 0 ? transaction.token0Symbol : transaction.token1Symbol
  const { chainId } = useActiveChainId()
  const chainName = useGetChainName()

  return (
    <ResponsiveGrid>
      <LinkExternal href={getEtherscanLink(chainId, transaction.hash, 'transaction')} isBscScan={chainName === 'BSC'}>
        <Text fontWeight={400}>
          {transaction.type === TransactionType.MINT
            ? `Add ${transaction.token0Symbol} and ${transaction.token1Symbol}`
            : transaction.type === TransactionType.SWAP
            ? `Swap ${inputTokenSymbol} for ${outputTokenSymbol}`
            : `Remove ${transaction.token0Symbol} and ${transaction.token1Symbol}`}
        </Text>
      </LinkExternal>
      <Text fontWeight={400}>{formatDollarAmount(transaction.amountUSD)}</Text>
      <Text fontWeight={400}>
        <HoverInlineText text={`${formatAmount(abs0)}  ${transaction.token0Symbol}`} maxCharacters={16} />
      </Text>
      <Text fontWeight={400}>
        <HoverInlineText text={`${formatAmount(abs1)}  ${transaction.token1Symbol}`} maxCharacters={16} />
      </Text>
      <Text fontWeight={400}>
        <LinkExternal href={getEtherscanLink(chainId, transaction.sender, 'address')} isBscScan={chainName === 'BSC'}>
          {shortenAddress(transaction.sender)}
        </LinkExternal>
      </Text>
      <Text fontWeight={400}>{formatTime(transaction.timestamp, 0)}</Text>
    </ResponsiveGrid>
  )
}

export default function TransactionTable({
  transactions,
  maxItems = 10,
}: {
  transactions: Transaction[]
  maxItems?: number
}) {
  const { t } = useTranslation()

  // theming
  const { theme } = useTheme()

  // for sorting
  const [sortField, setSortField] = useState(SORT_FIELD.timestamp)
  const [sortDirection, setSortDirection] = useState<boolean>(true)

  // pagination
  const [page, setPage] = useState(1)
  const [maxPage, setMaxPage] = useState(1)

  const [txFilter, setTxFilter] = useState<TransactionType | undefined>(undefined)
  const getSortFieldClassName = useSortFieldClassName(sortField, sortDirection)

  useEffect(() => {
    let extraPages = 1
    if (
      transactions.filter((x) => {
        return txFilter === undefined || x.type === txFilter
      }).length %
        maxItems ===
      0
    ) {
      extraPages = 0
    }
    setMaxPage(
      Math.floor(
        transactions.filter((x) => {
          return txFilter === undefined || x.type === txFilter
        }).length / maxItems,
      ) + extraPages,
    )
  }, [maxItems, transactions, txFilter])

  const onFilterChange = useCallback((filter: TransactionType | undefined) => {
    setPage(1)
    setTxFilter(filter)
  }, [])

  const sortedTransactions = useMemo(() => {
    return transactions
      ? transactions
          .slice()
          .sort((a, b) => {
            if (a && b) {
              return a[sortField as keyof Transaction] > b[sortField as keyof Transaction]
                ? (sortDirection ? -1 : 1) * 1
                : (sortDirection ? -1 : 1) * -1
            }
            return -1
          })
          .filter((x) => {
            return txFilter === undefined || x.type === txFilter
          })
          .slice(maxItems * (page - 1), page * maxItems)
      : []
  }, [transactions, maxItems, page, sortField, sortDirection, txFilter])

  const handleSort = useCallback(
    (newField: string) => {
      setSortField(newField)
      setSortDirection(sortField !== newField ? true : !sortDirection)
    },
    [sortDirection, sortField],
  )

  if (!transactions) {
    return <Loader />
  }

  return (
    <TableWrapper>
      <AutoColumn gap="16px">
        <ResponsiveGrid>
          <RowFixed>
            <SortText
              onClick={() => {
                onFilterChange(undefined)
              }}
              active={txFilter === undefined}
            >
              {t('All')}
            </SortText>
            <SortText
              onClick={() => {
                onFilterChange(TransactionType.SWAP)
              }}
              active={txFilter === TransactionType.SWAP}
            >
              {t('Swaps')}
            </SortText>
            <SortText
              onClick={() => {
                onFilterChange(TransactionType.MINT)
              }}
              active={txFilter === TransactionType.MINT}
            >
              {t('Adds')}
            </SortText>
            <SortText
              onClick={() => {
                onFilterChange(TransactionType.BURN)
              }}
              active={txFilter === TransactionType.BURN}
            >
              {t('Removes')}
            </SortText>
          </RowFixed>
          <ClickableColumnHeader color={theme.colors.textSubtle}>
            {t('Total Value')}
            <SortButton
              scale="sm"
              variant="subtle"
              onClick={() => handleSort(SORT_FIELD.amountUSD)}
              className={getSortFieldClassName(SORT_FIELD.amountUSD)}
            >
              <SortArrowIcon />
            </SortButton>
          </ClickableColumnHeader>
          <ClickableColumnHeader color={theme.colors.textSubtle}>
            {t('Token%index% Amount', { index: '0' })}
            <SortButton
              scale="sm"
              variant="subtle"
              onClick={() => handleSort(SORT_FIELD.amountToken0)}
              className={getSortFieldClassName(SORT_FIELD.amountToken0)}
            >
              <SortArrowIcon />
            </SortButton>
          </ClickableColumnHeader>
          <ClickableColumnHeader color={theme.colors.textSubtle}>
            {t('Token%index% Amount', { index: '1' })}
            <SortButton
              scale="sm"
              variant="subtle"
              onClick={() => handleSort(SORT_FIELD.amountToken1)}
              className={getSortFieldClassName(SORT_FIELD.amountToken1)}
            >
              <SortArrowIcon />
            </SortButton>
          </ClickableColumnHeader>
          <ClickableColumnHeader color={theme.colors.textSubtle}>
            {t('Account')}
            <SortButton
              scale="sm"
              variant="subtle"
              onClick={() => handleSort(SORT_FIELD.sender)}
              className={getSortFieldClassName(SORT_FIELD.sender)}
            >
              <SortArrowIcon />
            </SortButton>
          </ClickableColumnHeader>
          <ClickableColumnHeader color={theme.colors.textSubtle}>
            {`${t('Time')} `}
            <SortButton
              scale="sm"
              variant="subtle"
              onClick={() => handleSort(SORT_FIELD.timestamp)}
              className={getSortFieldClassName(SORT_FIELD.timestamp)}
            >
              <SortArrowIcon />
            </SortButton>
          </ClickableColumnHeader>
        </ResponsiveGrid>
        <Break />

        {sortedTransactions.map((d, index) => {
          if (d) {
            return (
              // eslint-disable-next-line react/no-array-index-key
              <React.Fragment key={`${d.hash}/${d.timestamp}/${index}/transactionRecord`}>
                <DataRow transaction={d} />
                <Break />
              </React.Fragment>
            )
          }
          return null
        })}
        {sortedTransactions.length === 0 ? <Text>{t('No Transactions')}</Text> : undefined}
        <PageButtons>
          <Box
            onClick={() => {
              setPage(page === 1 ? page : page - 1)
            }}
          >
            <Arrow>
              <ArrowBackIcon color={page === 1 ? 'textDisabled' : 'primary'} />
            </Arrow>
          </Box>
          <Text>{`Page ${page} of ${maxPage}`}</Text>
          <Box
            onClick={() => {
              setPage(page === maxPage ? page : page + 1)
            }}
          >
            <Arrow>
              <ArrowForwardIcon color={page === maxPage ? 'textDisabled' : 'primary'} />
            </Arrow>
          </Box>
        </PageButtons>
      </AutoColumn>
    </TableWrapper>
  )
}