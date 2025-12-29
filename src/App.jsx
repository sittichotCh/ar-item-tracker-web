import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hoveredItem, setHoveredItem] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Load filters from localStorage or use defaults
  const [filters, setFilters] = useState(() => {
    const savedFilters = localStorage.getItem('arcraider-filters')
    if (savedFilters) {
      try {
        return JSON.parse(savedFilters)
      } catch {
        return {
          gearBench: '0',
          explosivesStation: '0',
          medStation: '0',
          refiner: '0',
          scrappy: '0',
          utilityBench: '0',
          gunsmith: '0'
        }
      }
    }
    return {
      gearBench: '0',
      explosivesStation: '0',
      medStation: '0',
      refiner: '0',
      scrappy: '0',
      utilityBench: '0',
      gunsmith: '0'
    }
  })

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load data')
        }
        return response.json()
      })
      .then(data => {
        setItems(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Mapping filter names to hideout IDs
  const filterToHideoutId = {
    gearBench: 'equipment_bench',
    explosivesStation: 'explosives_bench',
    medStation: 'med_station',
    refiner: 'refiner',
    scrappy: 'scrappy',
    utilityBench: 'utility_bench',
    gunsmith: 'weapon_bench'
  }

  // Filter items based on hideoutUpgrade field and filter levels
  const upgradeHideoutItems = items.filter(item => {
    if (!item.hideoutUpgrade || item.hideoutUpgrade === null || item.hideoutUpgrade.length === 0) {
      return false
    }

    // Check if any hideout upgrade requirement is higher than the filter level
    const shouldShow = item.hideoutUpgrade.some(upgrade => {
      // Find which filter corresponds to this hideout ID
      const filterKey = Object.keys(filterToHideoutId).find(
        key => filterToHideoutId[key] === upgrade.id
      )

      if (!filterKey) {
        return false // If no matching filter, don't show based on this upgrade
      }

      const filterLevel = parseInt(filters[filterKey])
      const requiredLevel = upgrade.level

      // Show if required level is higher than filter level
      return requiredLevel > filterLevel
    })

    return shouldShow
  })

  // Get IDs of items already in upgrade hideout tier
  const upgradeHideoutItemIds = new Set(upgradeHideoutItems.map(item => item.id))

  // Filter remaining items (exclude items already in upgrade hideout)
  const remainingItems = items.filter(item => !upgradeHideoutItemIds.has(item.id))

  // Crafting items: items with craftsInto field that has value and is not empty
  const craftingItems = remainingItems.filter(item => {
    return item.craftsInto && Array.isArray(item.craftsInto) && item.craftsInto.length > 0
  })

  // Get IDs of items already in crafting tier
  const craftingItemIds = new Set(craftingItems.map(item => item.id))

  // Filter remaining items (exclude items already in upgrade hideout and crafting)
  const remainingItems2 = remainingItems.filter(item => !craftingItemIds.has(item.id))

  // Recycle/Sell items: items with salvagesInto or recyclesInto field that has value and is not empty
  const recycleSellItems = remainingItems2.filter(item => {
    const hasSalvagesInto = item.salvagesInto && Array.isArray(item.salvagesInto) && item.salvagesInto.length > 0
    const hasRecyclesInto = item.recyclesInto && Array.isArray(item.recyclesInto) && item.recyclesInto.length > 0
    return hasSalvagesInto || hasRecyclesInto
  })

  // Get IDs of items already used in recycle/sell tier
  const recycleSellItemIds = new Set(recycleSellItems.map(item => item.id))
  const usedItemIds = new Set([...upgradeHideoutItemIds, ...craftingItemIds, ...recycleSellItemIds])

  // Sell items: all items not used in any other tier
  const sellItems = items.filter(item => !usedItemIds.has(item.id))

  // Sort function by rarity
  const rarityOrder = {
    'Legendary': 0,
    'Epic': 1,
    'Rare': 2,
    'Uncommon': 3,
    'Common': 4
  }

  const sortByRarity = (a, b) => {
    const rarityA = rarityOrder[a.rarity] ?? 999
    const rarityB = rarityOrder[b.rarity] ?? 999
    return rarityA - rarityB
  }

  const tiers = [
    {
      id: 'upgrade-hideout',
      name: 'Upgrade Hideout',
      color: '#ff7f7f',
      items: [...upgradeHideoutItems].sort(sortByRarity)
    },
    {
      id: 'crafting',
      name: 'Crafting Item',
      color: '#ffbf7f',
      items: [...craftingItems].sort(sortByRarity)
    },
    {
      id: 'recycle-sell',
      name: 'Recycle / Sell',
      color: '#ffff7f',
      items: [...recycleSellItems].sort(sortByRarity)
    }
  ]

  // Sort sell items by rarity as well
  const sortedSellItems = [...sellItems].sort(sortByRarity)

  if (loading) {
    return <div className="container"><h2>Loading...</h2></div>
  }

  if (error) {
    return <div className="container"><h2>Error: {error}</h2></div>
  }

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [filterName]: value
      }
      // Save to localStorage
      localStorage.setItem('arcraider-filters', JSON.stringify(newFilters))
      return newFilters
    })
  }

  const handleMouseEnter = (item, event, tierId) => {
    if (tierId === 'crafting' && item.craftsInto && item.craftsInto.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect()
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      })
      setHoveredItem(item)
    }
  }

  const handleMouseLeave = () => {
    setHoveredItem(null)
  }

  return (
    <div className="tiermaker-container">
      <h1 className="title">ARC Raider Items</h1>

      <div className="filters-container">
        <div className="filter-group">
          <label>Gear Bench:</label>
          <select
            value={filters.gearBench}
            onChange={(e) => handleFilterChange('gearBench', e.target.value)}
          >
            <option value="0">Level 0</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Explosives Station:</label>
          <select
            value={filters.explosivesStation}
            onChange={(e) => handleFilterChange('explosivesStation', e.target.value)}
          >
            <option value="0">Level 0</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Med Station:</label>
          <select
            value={filters.medStation}
            onChange={(e) => handleFilterChange('medStation', e.target.value)}
          >
            <option value="0">Level 0</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Refiner:</label>
          <select
            value={filters.refiner}
            onChange={(e) => handleFilterChange('refiner', e.target.value)}
          >
            <option value="0">Level 0</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Scrappy:</label>
          <select
            value={filters.scrappy}
            onChange={(e) => handleFilterChange('scrappy', e.target.value)}
          >
            <option value="0">Level 0</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
            <option value="5">Level 5</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Utility Bench:</label>
          <select
            value={filters.utilityBench}
            onChange={(e) => handleFilterChange('utilityBench', e.target.value)}
          >
            <option value="0">Level 0</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Gunsmith:</label>
          <select
            value={filters.gunsmith}
            onChange={(e) => handleFilterChange('gunsmith', e.target.value)}
          >
            <option value="0">Level 0</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
          </select>
        </div>
      </div>

      <div className="tiers">
        {tiers.map(tier => (
          <div key={tier.id} className="tier-row">
            <div className="tier-label" style={{ backgroundColor: tier.color }}>
              <span className="tier-name">{tier.name}</span>
            </div>
            <div className="tier-items">
              {tier.items.map(item => (
                <div
                  key={item.id}
                  className={`tier-item rarity-${item.rarity.toLowerCase()}`}
                  onMouseEnter={(e) => handleMouseEnter(item, e, tier.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="tier-item-image"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <span className="tier-item-name">{item.name}</span>
                  <span className="tier-item-value">{item.value || 0}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="unassigned-section">
        <h2 className="unassigned-title">Sell</h2>
        <div className="unassigned-items">
          {sortedSellItems.map(item => (
            <div key={item.id} className={`tier-item rarity-${item.rarity.toLowerCase()}`}>
              <img
                src={item.image}
                alt={item.name}
                className="tier-item-image"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
              <span className="tier-item-name">{item.name}</span>
              <span className="tier-item-value">{item.value || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {hoveredItem && (
        <div
          className="tooltip"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
          }}
        >
          <div className="tooltip-header">Crafts Into:</div>
          <div className="tooltip-content">
            {[...hoveredItem.craftsInto]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((craft, index) => (
                <div key={index} className="tooltip-item">
                  {craft.name}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
