/* Usable Sysbols ◎●←↑→↓↖↗↘↙ */

const mapID = [3101, 3201];					// MAP ID to input [ Normal Mode , Hard Mode ]
const MarkerItem = 553;

const FirstBossActions = {
	119: {msg: 'Back + Front (Slow)'},
	139: {msg: 'Back + Front (Fast)'},
	313: {msg: 'Circles (Slow)', mark_interval: 10, mark_distance: 300, mark_shift_distance: 75},
	314: {msg: 'Circles (Fast)', mark_interval: 10, mark_distance: 300, mark_shift_distance: 75},
	113: {msg: 'Jump (Slow)'},
	133: {msg: 'Jump (Fast)'},
	118: {msg: 'Jump P (Slow)'},
	138: {msg: 'Jump P (Fast)'},
	111: {msg: 'Back spray (Slow)'},
	131: {msg: 'Back spray (Fast)'},
	305: {msg: 'Pizza'}
};

const SecondBossActions = {
	231: {msg: 'OUT safe', mark_interval: 10, mark_distance: 300},
	232: {msg: 'IN safe', mark_interval: 10, mark_distance: 300},
	108: {msg: 'Back attack!'},
	235: {msg: 'Debuffs'},
	230: {msg: 'AOE'},
	228: {msg: 'Team up'}
};

module.exports = function nest_guide(mod) {
	const command = mod.command;
	let hooks = [],
		bossCurLocation,
		bossCurAngle,
		uid0 = 999999999n,
		sendToParty = false,
		enabled = true,
		itemhelper = true,
	   	streamenabled = false;
	
	mod.hook('S_LOAD_TOPO', 3, (event) => {
		if (event.zone === mapID[0]) 
		{								
			command.message('Welcome to Penguin Nest - Normal Mode');
			load();
		} 
		else if (event.zone === mapID[1]) {
			command.message('Welcome to Penguin Nest - Hard Mode');
			load();
		}
		else
		{
			unload();
		}
    });
	
	command.add(['nest', '!nest'], {
        $none() {
            enabled = !enabled;
			command.message('Nest Guide '+(enabled ? 'Enabled' : 'Disabled') + '.');
		},
		$default() {
			command.message('Error (typo?) in command! see README for the list of valid commands')
		},
		itemhelp() {
			itemhelper = !itemhelper;
			command.message('Item helper for safe spots '+(itemhelper ? 'Enabled' : 'Disabled') + '.');
		},
		toparty(arg) {
			if(arg === "stream")
			{
				streamenabled = !streamenabled;
				sendToParty = false;
				itemhelper = false;
				command.message((streamenabled ? 'Stream mode Enabled' : 'Stream mode Disabled'));
			}
			else
			{
				streamenabled = false;
				sendToParty = !sendToParty;
				command.message((sendToParty ? 'Nest Guide - Messages will be sent to the party' : 'Nest Guide - Only you will see messages in chat'));
			}
		}
	});
	
	function sendMessage(msg)
	{
		if (sendToParty) 
		{
			mod.toServer('C_CHAT', 1, {
			channel: 21, //21 = p-notice, 1 = party, 2 = guild
			message: msg
			});
		}
		else if(streamenabled) 
		{
			command.message(msg);
		}
		else 
		{
			mod.toClient('S_CHAT', 3, {
			channel: 21, //21 = p-notice, 1 = party
			name: 'DG-Guide',
			message: msg
			});
		}
	}
	
	function Spawnitem(item, angle, radius, lifetime) {
		let r = null, rads = null, finalrad = null, pos = {};
		
		r = bossCurAngle - Math.PI;
		finalrad = r - angle;
		pos.x = bossCurLocation.x + radius * Math.cos(finalrad);
		pos.y = bossCurLocation.y + radius * Math.sin(finalrad);
		pos.z = bossCurLocation.z;
		
		mod.send('S_SPAWN_COLLECTION', 4, {
			gameId : uid0,
			id : item,
			amount : 1,
			loc : pos,
			w : r,
			unk1 : 0,
			unk2 : 0
		});
		
		setTimeout(Despawn, lifetime, uid0);
		uid0--;
	}
	
	function Despawn(uid_arg0) {
		mod.send('S_DESPAWN_COLLECTION', 2, {
			gameId : uid_arg0
		});
	}
	
	function SpawnitemCircle(item, intervalDegrees, radius, lifetime, shift_distance, shift_angle)
	{
		if(shift_angle)
		{
			bossCurAngle = (bossCurAngle - Math.PI) - (shift_angle * (Math.PI / 180));
		}
		if(shift_distance)
		{
			bossCurLocation.x = bossCurLocation.x + shift_distance * Math.cos(bossCurAngle);
			bossCurLocation.y = bossCurLocation.y + shift_distance * Math.sin(bossCurAngle);
		}
		for (var angle = -Math.PI; angle <= Math.PI; angle += Math.PI * intervalDegrees / 180)
		{
			Spawnitem(item, angle, radius, lifetime);
		}
	}
	
	function load()
	{
		if(!hooks.length)
		{
			hook('S_ACTION_STAGE', 9, (event) => {
				if(!enabled || event.stage != 0) return;
				
				if (event.templateId === 1000)
				{
					let skill = event.skill.id % 1000;
					if(FirstBossActions[skill])
					{
						sendMessage(FirstBossActions[skill].msg);
						if(itemhelper && FirstBossActions[skill].mark_interval !== undefined)
						{
							bossCurLocation = event.loc;
							bossCurAngle = event.w;
							SpawnitemCircle(MarkerItem, FirstBossActions[skill].mark_interval, FirstBossActions[skill].mark_distance, 4000, FirstBossActions[skill].mark_shift_distance)
						}
					}
				}
				else if (event.templateId === 2000)
				{
					let skill = event.skill.id % 1000;
					if(SecondBossActions[skill])
					{
						sendMessage(SecondBossActions[skill].msg);
						if(itemhelper && SecondBossActions[skill].mark_interval !== undefined)
						{
							bossCurLocation = event.loc;
							bossCurAngle = event.w;
							SpawnitemCircle(MarkerItem, SecondBossActions[skill].mark_interval, SecondBossActions[skill].mark_distance, 3000)
						}
					}
				}
			});
		}
	}
	
	function unload()
	{
		if(hooks.length)
		{
			for(let h of hooks) mod.unhook(h);

			hooks = []
		}
	}

	function hook()
	{
		hooks.push(mod.hook(...arguments));
	}
}
