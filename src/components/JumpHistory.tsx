import React from 'react';

interface JumpHistoryProps {
  jumps: Array<{
    id: string;
    height: number;
    timestamp: number;
    duration: number;
    method: string;
  }>;
  maxHeight: number;
  averageHeight: number;
}

export const JumpHistory: React.FC<JumpHistoryProps> = ({ jumps, maxHeight, averageHeight }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getJumpColor = (height: number) => {
    if (height >= 5) return 'text-yellow-400';
    if (height >= 3) return 'text-green-400';
    if (height >= 1.5) return 'text-blue-400';
    return 'text-gray-400';
  };

  const getJumpLabel = (height: number) => {
    if (height >= 10) return '🏆 МЕГА ПРЫЖОК!';
    if (height >= 5) return '🔥 Отличный прыжок!';
    if (height >= 3) return '💪 Хороший прыжок!';
    if (height >= 1.5) return '✨ Неплохо!';
    return '👍 Запись';
  };

  if (jumps.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🪁</div>
        <p className="text-gray-400 text-lg">Пока нет прыжков</p>
        <p className="text-gray-500 text-sm mt-2">Начните сессию и прыгайте!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-3 text-center border border-yellow-500/30">
          <div className="text-2xl font-bold text-yellow-400">{maxHeight.toFixed(1)}м</div>
          <div className="text-xs text-gray-400 mt-1">Максимум</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-3 text-center border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-400">{averageHeight.toFixed(1)}м</div>
          <div className="text-xs text-gray-400 mt-1">Среднее</div>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-3 text-center border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{jumps.length}</div>
          <div className="text-xs text-gray-400 mt-1">Прыжков</div>
        </div>
      </div>

      {/* Jump List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {[...jumps].reverse().map((jump, index) => (
          <div
            key={jump.id}
            className="bg-gray-800/50 rounded-xl p-3 flex items-center justify-between border border-gray-700/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300">
                {jumps.length - index}
              </div>
              <div>
                <div className={`font-bold text-lg ${getJumpColor(jump.height)}`}>
                  {jump.height.toFixed(2)} м
                </div>
                <div className="text-xs text-gray-500">
                  {formatTime(jump.timestamp)} • {jump.method === 'motion' ? 'Акселерометр' : jump.method === 'gps' ? 'GPS' : 'Вручную'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">{getJumpLabel(jump.height)}</div>
              {jump.duration > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {jump.duration.toFixed(1)}с в воздухе
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
