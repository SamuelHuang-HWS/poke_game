<!--
 * @Author: Wensong Huang wensong.huang@eeoa.com
 * @Date: 2025-12-25 19:37:45
 * @LastEditors: Wensong Huang wensong.huang@eeoa.com
 * @LastEditTime: 2025-12-25 19:37:51
 * @FilePath: /poke_game/task_progress.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# 任务：修复游戏房间金币显示同步问题

## 问题描述
进入游戏房间后，用户座位上携带的金币一直没有改变，一直是刚进入房间携带的总数，应该与操作栏的金币数一致。

## 任务计划

### 1. 分析问题根源
- [ ] 检查PlayerSeat组件的金币显示逻辑
- [ ] 分析currentPlayerGold计算属性的数据源
- [ ] 对比座位金币和操作栏金币的数据来源差异

### 2. 检查数据流
- [ ] 查看auth store中的用户金币管理
- [ ] 检查socket事件中金币数据的更新机制
- [ ] 分析游戏状态更新时金币同步逻辑

### 3. 修复实现
- [ ] 统一金币数据源
- [ ] 确保游戏状态更新时金币同步
- [ ] 修复socket事件监听中的金币更新逻辑

### 4. 测试验证
- [ ] 验证修复后金币显示一致性
- [ ] 测试游戏过程中金币实时更新
- [ ] 确认操作栏金币与座位金币保持同步

## 预期结果
用户座位上显示的金币数应该与操作栏的金币数实时保持一致，在游戏过程中能够正确同步更新。
