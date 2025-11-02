// Коллизии по методичке преподавателя
(function() {
  AFRAME.registerComponent('reset-on-collision', {
    schema: {
      with: {default: '.collision'},
      colliderSize: {default: 0.5},
      smoothRecovery: {default: true},
      pushBackDistance: {default: 0}
    },

    init: function() {
      this.el.setAttribute('geometry', `primitive: box; width: ${this.data.colliderSize}; depth: ${this.data.colliderSize}; height: ${this.data.colliderSize}`);

      this.mesh = this.el.getObject3D('mesh');
      this.boundingBox = new THREE.Box3();
      this.collideWiths = this.el.sceneEl.querySelectorAll(this.data.with);

      this.lastKnownGoodPosition = new THREE.Vector3().copy(this.el.object3D.position);
      this.isColliding = false;
      this.collisionRecoverySpeed = 1.0; // быстрый возврат к безопасной позиции

      this.previousPosition = new THREE.Vector3().copy(this.el.object3D.position);
    },

    tick: function () {
      if (!this.mesh) return;

      this.boundingBox.setFromObject(this.mesh);
      var thisMin = this.boundingBox.min;
      var thisMax = this.boundingBox.max;

      var currentPosition = new THREE.Vector3().copy(this.el.object3D.position);
      var collisionResult = this.checkCollision(thisMin, thisMax);

      if (collisionResult.colliding) {
        // Возврат к последней безопасной позиции, без расчёта «дальнего отталкивания»
        var safe = this.lastKnownGoodPosition.clone();
        safe.y = currentPosition.y; // не трогаем Y
        if (this.data.smoothRecovery) {
          var newPosition = new THREE.Vector3();
          newPosition.lerpVectors(currentPosition, safe, this.collisionRecoverySpeed);
          this.el.setAttribute('position', newPosition);
        } else {
          this.el.setAttribute('position', safe);
        }
        this.isColliding = true;
      } else {
        if (!this.isColliding) {
          this.lastKnownGoodPosition.copy(currentPosition);
        }
        this.isColliding = false;
      }

      this.previousPosition.copy(currentPosition);
    },

    checkCollision: function(thisMin, thisMax) {
      var collisions = [];

      for (var i = 0; i < this.collideWiths.length; i++) {
        var collideWith = this.collideWiths[i];
        var collideWithMesh = collideWith.getObject3D('mesh');

        if (!collideWithMesh) continue;

        var collideWithBoundingBox = new THREE.Box3().setFromObject(collideWithMesh);
        var collideWithMin = collideWithBoundingBox.min;
        var collideWithMax = collideWithBoundingBox.max;

        var isColliding = (thisMin.x <= collideWithMax.x && thisMax.x >= collideWithMin.x) &&
                         (thisMin.y <= collideWithMax.y && thisMax.y >= collideWithMin.y) &&
                         (thisMin.z <= collideWithMax.z && thisMax.z >= collideWithMin.z);

        if (isColliding) {
          collisions.push({
            collideWithBox: collideWithBoundingBox,
            playerBox: new THREE.Box3().set(thisMin.clone(), thisMax.clone())
          });
        }
      }

      return {
        colliding: collisions.length > 0,
        collisions: collisions
      };
    },

    calculatePushBackPosition: function(currentPosition, collision) {
      var pushBack = new THREE.Vector3().copy(currentPosition);

      for (var i = 0; i < collision.collisions.length; i++) {
        var singleCollision = collision.collisions[i];
        var playerBox = singleCollision.playerBox;
        var obstacleBox = singleCollision.collideWithBox;

        var playerCenter = new THREE.Vector3();
        playerBox.getCenter(playerCenter);

        var obstacleCenter = new THREE.Vector3();
        obstacleBox.getCenter(obstacleCenter);

        var direction = new THREE.Vector3().subVectors(playerCenter, obstacleCenter);

        var overlapX = Math.min(playerBox.max.x - obstacleBox.min.x, obstacleBox.max.x - playerBox.min.x);
        var overlapZ = Math.min(playerBox.max.z - obstacleBox.min.z, obstacleBox.max.z - playerBox.min.z);

        if (Math.abs(overlapX) < Math.abs(overlapZ)) {
          if (direction.x > 0) {
            pushBack.x = obstacleBox.max.x + (playerBox.max.x - playerBox.min.x) / 2 + this.data.pushBackDistance;
          } else {
            pushBack.x = obstacleBox.min.x - (playerBox.max.x - playerBox.min.x) / 2 - this.data.pushBackDistance;
          }
        } else {
          if (direction.z > 0) {
            pushBack.z = obstacleBox.max.z + (playerBox.max.z - playerBox.min.z) / 2 + this.data.pushBackDistance;
          } else {
            pushBack.z = obstacleBox.min.z - (playerBox.max.z - playerBox.min.z) / 2 - this.data.pushBackDistance;
          }
        }
      }

      return pushBack;
    }
  });
})();

/* Simple collision reset component for A-Frame.
 * Usage: add reset-on-collision="with: .collision" to a moving entity (e.g. camera),
 * and add class="collision" to any entities you want to collide with.
 */
(function(){
  if (typeof AFRAME === 'undefined') return;
  AFRAME.registerComponent('reset-on-collision', {
    schema: { with: {type: 'string', default: '.collision'}, radius: {type: 'number', default: 0.35} },
    init: function(){
      this.prevLocal = this.el.object3D.position.clone();
      this.tmpBox = new THREE.Box3();
      this.tmpVec = new THREE.Vector3();
    },
    tick: function(){
      const obj3d = this.el.object3D;
      const worldPos = obj3d.getWorldPosition(new THREE.Vector3());
      const colliders = document.querySelectorAll(this.data.with);
      for (let i=0;i<colliders.length;i++){
        const obj = colliders[i].object3D; if (!obj) continue;
        this.tmpBox.setFromObject(obj);
        this.tmpVec.copy(worldPos);
        if (this.tmpBox.expandByScalar(this.data.radius).containsPoint(this.tmpVec)){
          // откат только по XZ, без дерганья по Y
          obj3d.position.x = this.prevLocal.x;
          obj3d.position.z = this.prevLocal.z;
          return;
        }
      }
      // safe — обновляем предыдущую локальную позицию
      this.prevLocal.copy(obj3d.position);
    }
  });
})();


