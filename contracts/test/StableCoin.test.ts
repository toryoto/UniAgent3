import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Stablecoin } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('Stablecoin', function () {
  let stablecoin: Stablecoin;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const name = 'USDC';
  const symbol = 'USDC';
  const decimals = 6;
  const initialSupply = 10000n * 10n ** BigInt(decimals); // 10000000000

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const Stablecoin = await ethers.getContractFactory('Stablecoin');
    stablecoin = await Stablecoin.deploy(name, symbol, initialSupply, decimals);
    await stablecoin.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should set the correct name, symbol, and decimals', async function () {
      expect(await stablecoin.name()).to.equal(name);
      expect(await stablecoin.symbol()).to.equal(symbol);
      expect(await stablecoin.decimals()).to.equal(decimals);
    });

    it('Should mint initial supply to owner', async function () {
      expect(await stablecoin.balanceOf(owner.address)).to.equal(initialSupply);
      expect(await stablecoin.totalSupply()).to.equal(initialSupply);
    });

    it('Should return correct DOMAIN_SEPARATOR', async function () {
      const domainSeparator = await stablecoin.DOMAIN_SEPARATOR();
      expect(domainSeparator).to.be.a('string');
      expect(domainSeparator).to.not.equal(ethers.ZeroHash);
    });

    it('Should return correct TYPEHASHs', async function () {
      const transferTypehash = await stablecoin.getTransferWithAuthorizationTypeHash();
      const cancelTypehash = await stablecoin.getCancelAuthorizationTypeHash();

      const expectedTransferTypehash = ethers.keccak256(
        ethers.toUtf8Bytes(
          'TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)'
        )
      );
      const expectedCancelTypehash = ethers.keccak256(
        ethers.toUtf8Bytes('CancelAuthorization(address authorizer,bytes32 nonce)')
      );

      expect(transferTypehash).to.equal(expectedTransferTypehash);
      expect(cancelTypehash).to.equal(expectedCancelTypehash);
    });
  });

  describe('Minting', function () {
    it('Should allow owner to mint tokens', async function () {
      const amount = ethers.parseUnits('1000', decimals);
      await stablecoin.connect(owner).mint(user1.address, amount);

      expect(await stablecoin.balanceOf(user1.address)).to.equal(amount);
      expect(await stablecoin.totalSupply()).to.equal(initialSupply + amount);
    });

    it('Should not allow non-owner to mint', async function () {
      const amount = ethers.parseUnits('1000', decimals);
      await expect(
        stablecoin.connect(user1).mint(user2.address, amount)
      ).to.be.revertedWithCustomError(stablecoin, 'OwnableUnauthorizedAccount');
    });

    it('Should not allow minting to zero address', async function () {
      const amount = ethers.parseUnits('1000', decimals);
      await expect(stablecoin.connect(owner).mint(ethers.ZeroAddress, amount)).to.be.revertedWith(
        'Cannot mint to zero address'
      );
    });

    it('Should not allow minting zero amount', async function () {
      await expect(stablecoin.connect(owner).mint(user1.address, 0)).to.be.revertedWith(
        'Amount must be positive'
      );
    });
  });

  describe('Transfer', function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits('1000', decimals);
      await stablecoin.connect(owner).mint(user1.address, amount);
    });

    it('Should transfer tokens between users', async function () {
      const amount = ethers.parseUnits('500', decimals);
      await stablecoin.connect(user1).transfer(user2.address, amount);

      expect(await stablecoin.balanceOf(user1.address)).to.equal(
        ethers.parseUnits('500', decimals)
      );
      expect(await stablecoin.balanceOf(user2.address)).to.equal(amount);
    });

    it('Should emit Transfer event', async function () {
      const amount = ethers.parseUnits('500', decimals);
      await expect(stablecoin.connect(user1).transfer(user2.address, amount))
        .to.emit(stablecoin, 'Transfer')
        .withArgs(user1.address, user2.address, amount);
    });
  });

  describe('Burning', function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits('1000', decimals);
      await stablecoin.connect(owner).mint(user1.address, amount);
    });

    it('Should allow users to burn their own tokens', async function () {
      const burnAmount = ethers.parseUnits('300', decimals);
      await stablecoin.connect(user1).burn(burnAmount);

      expect(await stablecoin.balanceOf(user1.address)).to.equal(
        ethers.parseUnits('700', decimals)
      );
      expect(await stablecoin.totalSupply()).to.equal(
        initialSupply + ethers.parseUnits('700', decimals)
      );
    });

    it('Should emit Transfer event when burning', async function () {
      const burnAmount = ethers.parseUnits('300', decimals);
      await expect(stablecoin.connect(user1).burn(burnAmount))
        .to.emit(stablecoin, 'Transfer')
        .withArgs(user1.address, ethers.ZeroAddress, burnAmount);
    });
  });

  describe('TransferWithAuthorization', function () {
    let domain: any;
    let types: any;

    beforeEach(async function () {
      const amount = ethers.parseUnits('1000', decimals);
      await stablecoin.connect(owner).mint(user1.address, amount);

      const chainId = (await ethers.provider.getNetwork()).chainId;
      const contractAddress = await stablecoin.getAddress();

      domain = {
        name: name,
        version: '2',
        chainId: chainId,
        verifyingContract: contractAddress,
      };

      types = {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ],
      };
    });

    it('Should transfer tokens with valid authorization', async function () {
      const transferAmount = ethers.parseUnits('500', decimals);
      const nonce = ethers.id('nonce1');
      const currentTime = BigInt(await time.latest());
      const validAfter = currentTime - 1000n;
      const validBefore = currentTime + 1000n;

      const message = {
        from: user1.address,
        to: user2.address,
        value: transferAmount,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await expect(
        stablecoin
          .connect(user2)
          .transferWithAuthorization(
            message.from,
            message.to,
            message.value,
            message.validAfter,
            message.validBefore,
            message.nonce,
            v,
            r,
            s
          )
      )
        .to.emit(stablecoin, 'AuthorizationUsed')
        .withArgs(user1.address, nonce)
        .to.emit(stablecoin, 'Transfer')
        .withArgs(user1.address, user2.address, transferAmount);

      expect(await stablecoin.balanceOf(user1.address)).to.equal(
        ethers.parseUnits('500', decimals)
      );
      expect(await stablecoin.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await stablecoin.authorizationState(user1.address, nonce)).to.be.true;
    });

    it('Should reject authorization that is not yet valid', async function () {
      const transferAmount = ethers.parseUnits('500', decimals);
      const nonce = ethers.id('nonce2');
      const currentTime = BigInt(await time.latest());
      const validAfter = currentTime + 1000n; // Future time
      const validBefore = currentTime + 2000n;

      const message = {
        from: user1.address,
        to: user2.address,
        value: transferAmount,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await expect(
        stablecoin
          .connect(user2)
          .transferWithAuthorization(
            message.from,
            message.to,
            message.value,
            message.validAfter,
            message.validBefore,
            message.nonce,
            v,
            r,
            s
          )
      ).to.be.revertedWith('Authorization not yet valid');
    });

    it('Should reject expired authorization', async function () {
      const transferAmount = ethers.parseUnits('500', decimals);
      const nonce = ethers.id('nonce3');
      const currentTime = BigInt(await time.latest());
      const validAfter = currentTime - 2000n;
      const validBefore = currentTime - 1000n; // Past time

      const message = {
        from: user1.address,
        to: user2.address,
        value: transferAmount,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await expect(
        stablecoin
          .connect(user2)
          .transferWithAuthorization(
            message.from,
            message.to,
            message.value,
            message.validAfter,
            message.validBefore,
            message.nonce,
            v,
            r,
            s
          )
      ).to.be.revertedWith('Authorization expired');
    });

    it('Should reject authorization with already used nonce', async function () {
      const transferAmount = ethers.parseUnits('500', decimals);
      const nonce = ethers.id('nonce4');
      const currentTime = BigInt(await time.latest());
      const validAfter = currentTime - 1000n;
      const validBefore = currentTime + 1000n;

      const message = {
        from: user1.address,
        to: user2.address,
        value: transferAmount,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // First use
      await stablecoin
        .connect(user2)
        .transferWithAuthorization(
          message.from,
          message.to,
          message.value,
          message.validAfter,
          message.validBefore,
          message.nonce,
          v,
          r,
          s
        );

      // Try to use again
      await expect(
        stablecoin
          .connect(user2)
          .transferWithAuthorization(
            message.from,
            message.to,
            message.value,
            message.validAfter,
            message.validBefore,
            message.nonce,
            v,
            r,
            s
          )
      ).to.be.revertedWith('Authorization already used');
    });

    it('Should reject authorization with invalid signature', async function () {
      const transferAmount = ethers.parseUnits('500', decimals);
      const nonce = ethers.id('nonce5');
      const currentTime = BigInt(await time.latest());
      const validAfter = currentTime - 1000n;
      const validBefore = currentTime + 1000n;

      const message = {
        from: user1.address,
        to: user2.address,
        value: transferAmount,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      // Sign with wrong signer (user2 instead of user1)
      const signature = await user2.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await expect(
        stablecoin
          .connect(user2)
          .transferWithAuthorization(
            message.from,
            message.to,
            message.value,
            message.validAfter,
            message.validBefore,
            message.nonce,
            v,
            r,
            s
          )
      ).to.be.revertedWith('Invalid signature');
    });
  });

  describe('CancelAuthorization', function () {
    let domain: any;
    let types: any;

    beforeEach(async function () {
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const contractAddress = await stablecoin.getAddress();

      domain = {
        name: name,
        version: '2',
        chainId: chainId,
        verifyingContract: contractAddress,
      };

      types = {
        CancelAuthorization: [
          { name: 'authorizer', type: 'address' },
          { name: 'nonce', type: 'bytes32' },
        ],
      };
    });

    it('Should cancel authorization with valid signature', async function () {
      const nonce = ethers.id('nonce-cancel1');

      const message = {
        authorizer: user1.address,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await expect(stablecoin.connect(user1).cancelAuthorization(user1.address, nonce, v, r, s))
        .to.emit(stablecoin, 'AuthorizationCanceled')
        .withArgs(user1.address, nonce);

      expect(await stablecoin.authorizationState(user1.address, nonce)).to.be.true;
    });

    it('Should reject canceling already used authorization', async function () {
      const nonce = ethers.id('nonce-cancel2');

      const message = {
        authorizer: user1.address,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // First cancel
      await stablecoin.connect(user1).cancelAuthorization(user1.address, nonce, v, r, s);

      // Try to cancel again
      await expect(
        stablecoin.connect(user1).cancelAuthorization(user1.address, nonce, v, r, s)
      ).to.be.revertedWith('Authorization already used');
    });

    it('Should reject canceling authorization with invalid signature', async function () {
      const nonce = ethers.id('nonce-cancel3');

      const message = {
        authorizer: user1.address,
        nonce: nonce,
      };

      // Sign with wrong signer (user2 instead of user1)
      const signature = await user2.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await expect(
        stablecoin.connect(user1).cancelAuthorization(user1.address, nonce, v, r, s)
      ).to.be.revertedWith('Invalid signature');
    });
  });

  describe('Authorization State', function () {
    it('Should return false for unused nonce', async function () {
      const nonce = ethers.id('unused-nonce');
      expect(await stablecoin.authorizationState(user1.address, nonce)).to.be.false;
    });

    it('Should return true after authorization is used', async function () {
      const amount = ethers.parseUnits('1000', decimals);
      await stablecoin.connect(owner).mint(user1.address, amount);

      const transferAmount = ethers.parseUnits('500', decimals);
      const nonce = ethers.id('test-nonce');
      const currentTime = BigInt(await time.latest());
      const validAfter = currentTime - 1000n;
      const validBefore = currentTime + 1000n;

      const chainId = (await ethers.provider.getNetwork()).chainId;
      const contractAddress = await stablecoin.getAddress();

      const domain = {
        name: name,
        version: '2',
        chainId: chainId,
        verifyingContract: contractAddress,
      };

      const types = {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ],
      };

      const message = {
        from: user1.address,
        to: user2.address,
        value: transferAmount,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      const signature = await user1.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await stablecoin
        .connect(user2)
        .transferWithAuthorization(
          message.from,
          message.to,
          message.value,
          message.validAfter,
          message.validBefore,
          message.nonce,
          v,
          r,
          s
        );

      expect(await stablecoin.authorizationState(user1.address, nonce)).to.be.true;
    });
  });
});
