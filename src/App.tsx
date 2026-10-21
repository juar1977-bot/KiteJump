import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMotionSensor } from './hooks/useMotionSensor';
import { useJumpTracker } from './hooks/useJumpTracker';
import { JumpHistory } from './components/JumpHistory';

type Tab = 'jump' | 'history' | 'info';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('jump');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [lastJumpHeight, setLastJumpHeight] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [manualHeight, setManualHeight] = useState('');
  const [sensorPermission, setSensorPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [isDetecting, setIsDetecting] = useState(false);
  
  const { motionData, isListening, error: motionError, startListening: startMotion, stopListening: stopMotion } = useMotionSensor();
  const { session, addJump, startSession, stopSession, clearSession } = useJumpTracker();
  
  const prevJumpHeightRef = useRef(0);
  const jumpCooldownRef = useRef(false);

  // Check for jump completion from motion sensor
  useEffect(() => {
    if (motionData.currentJumpHeight > 0 && motionData.currentJumpHeight !== prevJumpHeightRef.current) {
      if (!jumpCooldownRef.current && isSessionActive) {
        jumpCooldownRef.current = true;
        const height = motionData.currentJumpHeight;
        setLastJumpHeight(height);
        addJump(height, 0, 'motion');
        
        if (height >= 3) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
        
        setTimeout(() => {
          jumpCooldownRef.current = false;
        }, 2000);
      }
      prevJumpHeightRef.current = motionData.currentJumpHeight;
    }
  }, [motionData.currentJumpHeight, isSessionActive, addJump]);

  const handleStartSession = useCallback(async () => {
    setIsSessionActive(true);
    startSession();
    
    // Try to start motion sensor
    try {
      await startMotion();
      setSensorPermission('granted');
      setIsDetecting(true);
    } catch {
      setSensorPermission('denied');
    }
  }, [startSession, startMotion]);

  const handleStopSession = useCallback(() => {
    setIsSessionActive(false);
    stopSession();
    stopMotion();
    setIsDetecting(false);
  }, [stopSession, stopMotion]);

  const handleManualJump = useCallback(() => {
    const height = parseFloat(manualHeight);
    if (height > 0 && isSessionActive) {
      setLastJumpHeight(height);
      addJump(height, 0, 'manual');
      setManualHeight('');
      
      if (height >= 3) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    }
  }, [manualHeight, isSessionActive, addJump]);

  const getAltitudeMessage = (height: number) => {
    if (height >= 10) return '🏆 НЕВЕРОЯТНО!';
    if (height >= 5) return '🔥 ОГОНЬ!';
    if (height >= 3) return '💪 Отлично!';
    if (height >= 1.5) return '✨ Хорошо!';
    if (height >= 0.5) return '👍 Неплохо';
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900/20 to-gray-900 text-white">
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-3xl font-bold text-yellow-400">
              {getAltitudeMessage(lastJumpHeight)}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              🪁 KiteJump
            </h1>
            <p className="text-xs text-gray-400 mt-1">Измеритель высоты прыжков</p>
          </div>
          <div className="flex items-center gap-2">
            {isSessionActive && (
              <div className="flex items-center gap-1 bg-green-500/20 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">LIVE</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-24">
        {activeTab === 'jump' && (
          <div className="space-y-6">
            {/* Jump Display */}
            <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-3xl p-6 border border-gray-700/50 backdrop-blur-sm overflow-hidden">
              {/* Background animation */}
              <div className="absolute inset-0 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent transition-opacity duration-500 ${motionData.isJumping ? 'opacity-100' : 'opacity-0'}`}></div>
                {isDetecting && (
                  <div className="absolute top-4 right-4 w-3 h-3">
                    <div className="w-full h-full bg-cyan-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                )}
              </div>

              <div className="relative z-10">
                {/* Current/Last Jump Height */}
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-400 mb-2">
                    {motionData.isJumping ? '🚀 В ПОЛЁТЕ...' : 'Высота прыжка'}
                  </div>
                  <div className={`text-7xl font-black transition-all duration-300 ${
                    motionData.isJumping ? 'text-cyan-400 scale-110' : 'text-white'
                  }`}>
                    {lastJumpHeight > 0 ? lastJumpHeight.toFixed(2) : '0.00'}
                  </div>
                  <div className="text-2xl text-gray-400 mt-1">метров</div>
                  {lastJumpHeight > 0 && (
                    <div className="text-lg mt-2 text-yellow-400">
                      {getAltitudeMessage(lastJumpHeight)}
                    </div>
                  )}
                </div>

                {/* Sensor Data */}
                {isDetecting && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-500">X</div>
                      <div className="text-sm font-mono text-cyan-400">
                        {motionData.accelerationX.toFixed(1)}
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-500">Y</div>
                      <div className="text-sm font-mono text-cyan-400">
                        {motionData.accelerationY.toFixed(1)}
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-500">Z</div>
                      <div className="text-sm font-mono text-cyan-400">
                        {motionData.accelerationZ.toFixed(1)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Session Controls */}
            <div className="space-y-3">
              {!isSessionActive ? (
                <button
                  onClick={handleStartSession}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl text-lg font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-transform"
                >
                  ▶️ Начать сессию
                </button>
              ) : (
                <button
                  onClick={handleStopSession}
                  className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl text-lg font-bold shadow-lg shadow-red-500/25 active:scale-95 transition-transform"
                >
                  ⏹️ Завершить сессию
                </button>
              )}

              {/* Session Stats */}
              {isSessionActive && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                    <div className="text-xs text-gray-400">Лучший прыжок</div>
                    <div className="text-xl font-bold text-yellow-400">
                      {session.maxHeight.toFixed(2)} м
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                    <div className="text-xs text-gray-400">Всего прыжков</div>
                    <div className="text-xl font-bold text-green-400">
                      {session.totalJumps}
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Entry */}
              {isSessionActive && (
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-sm text-gray-400 mb-2">Ручной ввод высоты:</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={manualHeight}
                      onChange={(e) => setManualHeight(e.target.value)}
                      placeholder="Высота в метрах"
                      className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={handleManualJump}
                      disabled={!manualHeight || parseFloat(manualHeight) <= 0}
                      className="px-4 py-2 bg-cyan-600 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {motionError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="text-red-400 text-sm">⚠️ {motionError}</div>
                <div className="text-gray-400 text-xs mt-2">
                  Используйте ручной ввод для записи прыжков
                </div>
              </div>
            )}

            {/* Quick Stats */}
            {session.jumps.length > 0 && (
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                <div className="text-sm text-gray-400 mb-3">Статистика сессии</div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (session.jumps[session.jumps.length - 1]?.height / Math.max(session.maxHeight, 1)) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Последний: {session.jumps[session.jumps.length - 1]?.height.toFixed(2)}м / {session.maxHeight.toFixed(2)}м
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">История прыжков</h2>
              {session.jumps.length > 0 && (
                <button
                  onClick={clearSession}
                  className="text-sm text-red-400 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/30"
                >
                  Очистить
                </button>
              )}
            </div>
            <JumpHistory
              jumps={session.jumps}
              maxHeight={session.maxHeight}
              averageHeight={session.averageHeight}
            />
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>📱</span> Как использовать
              </h2>
              <div className="space-y-4 text-gray-300">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">1</div>
                  <div>
                    <div className="font-medium text-white">Закрепите телефон</div>
                    <div className="text-sm text-gray-400 mt-1">Поместите телефон в водонепроницаемый чехол и закрепите на теле или трапеции</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">2</div>
                  <div>
                    <div className="font-medium text-white">Начните сессию</div>
                    <div className="text-sm text-gray-400 mt-1">Нажмите "Начать сессию" и разрешите доступ к датчикам</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">3</div>
                  <div>
                    <div className="font-medium text-white">Прыгайте!</div>
                    <div className="text-sm text-gray-400 mt-1">Акселерометр автоматически определит прыжок и рассчитает высоту</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">4</div>
                  <div>
                    <div className="font-medium text-white">Или введите вручную</div>
                    <div className="text-sm text-gray-400 mt-1">Если датчики не работают, введите высоту прыжка вручную</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>⚙️</span> Как это работает
              </h2>
              <div className="space-y-3 text-sm text-gray-300">
                <p>
                  <span className="text-cyan-400 font-medium">Акселерометр:</span> Определяет момент взлёта и приземления по изменению ускорения. Высота рассчитывается по времени нахождения в воздухе: h = ½ × g × (t/2)²
                </p>
                <p>
                  <span className="text-cyan-400 font-medium">Ручной ввод:</span> Если у вас есть видеозапись или вы знаете высоту, можно ввести её вручную для точной статистики.
                </p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>💡</span> Советы
              </h2>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex gap-2">
                  <span className="text-yellow-400">•</span>
                  Для лучшего результата закрепите телефон максимально близко к центру тяжести тела
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-400">•</span>
                  Используйте водонепроницаемый чехол — кайтсерфинг подразумевает воду!
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-400">•</span>
                  Автоматическое определение работает лучше всего на Android с хорошим акселерометром
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-400">•</span>
                  Для iPhone может потребоваться ручной ввод из-за ограничений Safari
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-400">•</span>
                  Держите экран включённым во время сессии для непрерывного отслеживания
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-5 border border-cyan-500/30">
              <h2 className="text-lg font-bold mb-2 text-cyan-400">🪁 KiteJump v1.0</h2>
              <p className="text-sm text-gray-400">
                Веб-приложение для измерения высоты прыжков кайтсерфера. 
                Работает на любом смартфоне через браузер. 
                Используйте датчики устройства или вводите данные вручную.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 px-4 py-2">
        <div className="flex justify-around max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('jump')}
            className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
              activeTab === 'jump' ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <span className="text-2xl">🪂</span>
            <span className="text-xs mt-1">Прыжок</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
              activeTab === 'history' ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <span className="text-2xl">📊</span>
            <span className="text-xs mt-1">История</span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
              activeTab === 'info' ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <span className="text-2xl">ℹ️</span>
            <span className="text-xs mt-1">Инфо</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
